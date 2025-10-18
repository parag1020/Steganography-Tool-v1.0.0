#!/usr/bin/env python3
"""
LSB Steganography Tool (stegolsb.py)

Python 3.8+

Features
- Embed (hide) and extract (recover) text or files inside images using Least-Significant Bits (LSB)
- Optional password-based encryption (AES-256-GCM) with PBKDF2-HMAC-SHA256
- Capacity checks and user-friendly messages
- Supports PNG and BMP (lossless). JPEG is lossy and not recommended; explicit allowance required.

Header Format (big-endian network byte order)
All fields are bytes unless specified. Layout:
  magic              : 8 bytes (b'STEGOLSB')
  version            : 1 byte  (0x01)
  header_len         : 4 bytes (uint32) length of the remainder of the header starting after this field
  bits               : 1 byte  (number of LSBs used per channel, 1-4)
  channels_code      : 1 byte  (0=R,1=G,2=B,3=RGB,4=RGBA)
  encrypted_flag     : 1 byte  (0 or 1)
  payload_type       : 1 byte  (0=text,1=file)
  filename_len       : 2 bytes (uint16)
  payload_len        : 8 bytes (uint64)
  filename           : filename_len bytes (utf-8)
  if encrypted_flag==1:
      salt_len       : 1 byte
      salt           : salt_len bytes
      nonce_len      : 1 byte
      nonce          : nonce_len bytes

Notes
- AES-256-GCM uses a 32-byte key derived via PBKDF2-HMAC-SHA256 with >=100,000 iterations.
- We use cryptography's AESGCM, which returns ciphertext with the tag appended. Only salt and nonce are stored in the header.
- Image scan order is row-major, channels in the order R, G, B, (A if used).
- Bits are placed into the least significant bits of each selected channel.
- Extraction auto-detects bits and channels from the header; if the user passes explicit values with --force-params, those will be used for reading.

Ethical Use
This tool is for educational and lawful purposes only. Do not use to hide malicious
content or to evade law enforcement. Only operate on images you own or have permission to use.
"""

from __future__ import annotations

import argparse
import getpass
import os
import struct
import sys
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

from PIL import Image

try:
    # cryptography is widely available and robust
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    CRYPTO_AVAILABLE = True
except Exception:  # pragma: no cover - if cryptography missing
    CRYPTO_AVAILABLE = False


# ----------------------------- Constants ----------------------------------

MAGIC = b"STEGOLSB"  # 8 bytes
VERSION = 1

CHANNEL_CODES = {
    "r": 0,
    "g": 1,
    "b": 2,
    "rgb": 3,
    "rgba": 4,
}

REVERSE_CHANNEL_CODES = {v: k for k, v in CHANNEL_CODES.items()}

PAYLOAD_TEXT = 0
PAYLOAD_FILE = 1

PBKDF2_ITERATIONS = 200_000
PBKDF2_SALT_BYTES = 16
AESGCM_NONCE_BYTES = 12
AESGCM_KEY_BYTES = 32


# ----------------------------- Utilities ----------------------------------

def eprint(*args: object, **kwargs: object) -> None:
    print(*args, file=sys.stderr, **kwargs)


def human_size(num_bytes: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(num_bytes)
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            return f"{size:.2f} {unit}"
        size /= 1024.0


def calc_capacity_bits(width: int, height: int, channels_used: int, bits: int) -> int:
    return width * height * channels_used * bits


def calc_capacity_bytes(width: int, height: int, channels_used: int, bits: int) -> int:
    return calc_capacity_bits(width, height, channels_used, bits) // 8


def require_crypto() -> None:
    if not CRYPTO_AVAILABLE:
        raise RuntimeError(
            "cryptography is required for --encrypt/--password. Install via 'pip install cryptography'."
        )


def derive_key(password: str, salt: bytes) -> bytes:
    backend = default_backend()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=AESGCM_KEY_BYTES,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
        backend=backend,
    )
    return kdf.derive(password.encode("utf-8"))


def aesgcm_encrypt(plaintext: bytes, password: str) -> Tuple[bytes, bytes, bytes]:
    """Return (ciphertext_with_tag, salt, nonce)."""
    require_crypto()
    import os as _os

    salt = _os.urandom(PBKDF2_SALT_BYTES)
    key = derive_key(password, salt)
    nonce = _os.urandom(AESGCM_NONCE_BYTES)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data=None)
    return ciphertext, salt, nonce


def aesgcm_decrypt(ciphertext: bytes, password: str, salt: bytes, nonce: bytes) -> bytes:
    require_crypto()
    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, associated_data=None)


# ----------------------------- Bitstream ----------------------------------

class BitWriter:
    def __init__(self) -> None:
        self._bits: List[int] = []  # store 0/1

    def write_bytes(self, data: bytes) -> None:
        for byte in data:
            for i in range(7, -1, -1):
                self._bits.append((byte >> i) & 1)

    def __len__(self) -> int:
        return len(self._bits)

    def iter_chunks(self, chunk_size: int) -> Iterable[int]:
        """Iterate over successive groups of chunk_size bits (as integer 0..(2^chunk_size-1)).
        If remaining bits are fewer than chunk_size, pad with zeros on the right.
        """
        idx = 0
        n = len(self._bits)
        while idx < n:
            val = 0
            for _ in range(chunk_size):
                val = (val << 1) | (self._bits[idx] if idx < n else 0)
                idx += 1
            yield val


class BitReader:
    def __init__(self, bit_iter: Iterable[int]) -> None:
        self._iter = iter(bit_iter)

    def read_bits(self, n: int) -> List[int]:
        out: List[int] = []
        for _ in range(n):
            try:
                out.append(next(self._iter))
            except StopIteration:
                out.append(0)
        return out

    @staticmethod
    def bits_to_bytes(bits: Sequence[int]) -> bytes:
        out = bytearray()
        for i in range(0, len(bits), 8):
            b = 0
            for j in range(8):
                b = (b << 1) | (bits[i + j] if i + j < len(bits) else 0)
            out.append(b)
        return bytes(out)


# ----------------------------- Image LSB ----------------------------------

def get_channel_indices(channel: str) -> Tuple[int, ...]:
    if channel == "r":
        return (0,)
    if channel == "g":
        return (1,)
    if channel == "b":
        return (2,)
    if channel == "rgb":
        return (0, 1, 2)
    if channel == "rgba":
        return (0, 1, 2, 3)
    raise ValueError(f"Unsupported channel: {channel}")


def normalize_image_for_channel(img: Image.Image, channel: str) -> Image.Image:
    if channel == "rgba":
        if img.mode != "RGBA":
            return img.convert("RGBA")
        return img
    else:
        if img.mode not in ("RGB", "RGBA"):
            return img.convert("RGB")
        # If RGBA but channel is not rgba, it's fine to keep RGBA
        return img


def embed_bits_into_image(
    img: Image.Image,
    bits_per_channel: int,
    channel: str,
    data_bits: Iterable[int],
) -> Image.Image:
    channels_idx = get_channel_indices(channel)
    mask_clear = 0xFF ^ ((1 << bits_per_channel) - 1)

    pixels = img.load()
    width, height = img.size

    bit_iter = iter(data_bits)

    for y in range(height):
        for x in range(width):
            px = list(pixels[x, y])
            for ci in channels_idx:
                try:
                    val = 0
                    for _ in range(bits_per_channel):
                        val = (val << 1) | next(bit_iter)
                except StopIteration:
                    # No more bits to embed; return image as is
                    pixels[x, y] = tuple(px)
                    return img
                px[ci] = (px[ci] & mask_clear) | val
            pixels[x, y] = tuple(px)
    return img


def extract_bits_from_image(
    img: Image.Image,
    bits_per_channel: int,
    channel: str,
) -> Iterable[int]:
    channels_idx = get_channel_indices(channel)
    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            px = pixels[x, y]
            for ci in channels_idx:
                val = px[ci] & ((1 << bits_per_channel) - 1)
                # yield bits from MSB to LSB of the selected bits
                for i in range(bits_per_channel - 1, -1, -1):
                    yield (val >> i) & 1


# ----------------------------- Header -------------------------------------

@dataclass
class StegoHeader:
    bits: int
    channel_code: int
    encrypted: bool
    payload_type: int
    filename: str
    payload_len: int
    salt: Optional[bytes] = None
    nonce: Optional[bytes] = None

    def to_bytes(self) -> bytes:
        filename_bytes = self.filename.encode("utf-8") if self.filename else b""
        base = bytearray()
        base += MAGIC
        base += struct.pack(
            ">B", VERSION
        )

        body = bytearray()
        body += struct.pack(
            ">BBBBHQ",
            self.bits & 0xFF,
            self.channel_code & 0xFF,
            1 if self.encrypted else 0,
            self.payload_type & 0xFF,
            len(filename_bytes) & 0xFFFF,
            self.payload_len,
        )
        body += filename_bytes

        if self.encrypted:
            assert self.salt is not None and self.nonce is not None
            if len(self.salt) > 255 or len(self.nonce) > 255:
                raise ValueError("salt/nonce too long to encode")
            body += struct.pack(">B", len(self.salt)) + self.salt
            body += struct.pack(">B", len(self.nonce)) + self.nonce

        base += struct.pack(">I", len(body))  # header_len
        base += body
        return bytes(base)

    @staticmethod
    def parse(data: bytes) -> "StegoHeader":
        if len(data) < 8 + 1 + 4:
            raise ValueError("Incomplete header")
        if data[:8] != MAGIC:
            raise ValueError("Magic bytes not found; not a valid stego payload")
        version = data[8]
        if version != VERSION:
            raise ValueError(f"Unsupported version: {version}")
        header_len = struct.unpack(">I", data[9:13])[0]
        if len(data) < 13 + header_len:
            raise ValueError("Incomplete header body")
        body = data[13 : 13 + header_len]

        if len(body) < 1 + 1 + 1 + 1 + 2 + 8:
            raise ValueError("Header too short")
        bits, channel_code, encrypted_flag, payload_type, filename_len, payload_len = struct.unpack(
            ">BBBBHQ", body[:1 + 1 + 1 + 1 + 2 + 8]
        )
        idx = 1 + 1 + 1 + 1 + 2 + 8
        if len(body) < idx + filename_len:
            raise ValueError("Header filename truncated")
        filename_bytes = body[idx : idx + filename_len]
        filename = filename_bytes.decode("utf-8") if filename_len > 0 else ""
        idx += filename_len

        salt = None
        nonce = None
        if encrypted_flag == 1:
            if len(body) < idx + 1:
                raise ValueError("Header missing salt_len")
            salt_len = body[idx]
            idx += 1
            if len(body) < idx + salt_len:
                raise ValueError("Header salt truncated")
            salt = body[idx : idx + salt_len]
            idx += salt_len
            if len(body) < idx + 1:
                raise ValueError("Header missing nonce_len")
            nonce_len = body[idx]
            idx += 1
            if len(body) < idx + nonce_len:
                raise ValueError("Header nonce truncated")
            nonce = body[idx : idx + nonce_len]
            idx += nonce_len

        return StegoHeader(
            bits=bits,
            channel_code=channel_code,
            encrypted=(encrypted_flag == 1),
            payload_type=payload_type,
            filename=filename,
            payload_len=payload_len,
            salt=salt,
            nonce=nonce,
        )


# ----------------------------- Core Logic ---------------------------------

def check_image_format_for_embed(input_path: str, allow_lossy: bool, verbose: bool) -> None:
    ext = os.path.splitext(input_path)[1].lower().lstrip(".")
    if ext in {"jpg", "jpeg"} and not allow_lossy:
        raise ValueError(
            "Input image is JPEG (lossy). Use --allow-lossy to proceed, or convert to PNG/BMP to avoid corruption."
        )
    if verbose and ext in {"jpg", "jpeg"} and allow_lossy:
        eprint("[warn] Proceeding with lossy JPEG; embedded data may be corrupted by recompression.")


def compute_channels_used(channel: str) -> int:
    return len(get_channel_indices(channel))


def ensure_output_does_not_exist(path: str, force: bool) -> None:
    if os.path.exists(path) and not force:
        raise FileExistsError(
            f"Output path '{path}' already exists. Use --force to overwrite."
        )


def build_payload(payload_text: Optional[str], payload_file: Optional[str]) -> Tuple[int, bytes, str]:
    if payload_text is None and payload_file is None:
        raise ValueError("Provide either --payload-text or --payload-file")
    if payload_text is not None and payload_file is not None:
        raise ValueError("Use only one of --payload-text or --payload-file, not both")

    if payload_text is not None:
        data = payload_text.encode("utf-8")
        return PAYLOAD_TEXT, data, ""
    else:
        with open(payload_file, "rb") as f:
            data = f.read()
        filename = os.path.basename(payload_file)
        return PAYLOAD_FILE, data, filename


def perform_embed(
    input_image: str,
    output_image: str,
    payload_text: Optional[str],
    payload_file: Optional[str],
    encrypt: bool,
    password: Optional[str],
    bits: int,
    channel: str,
    out_format: str,
    allow_lossy: bool,
    force: bool,
    verbose: bool,
) -> None:
    if bits < 1 or bits > 4:
        raise ValueError("--bits must be between 1 and 4")

    check_image_format_for_embed(input_image, allow_lossy=allow_lossy, verbose=verbose)
    ensure_output_does_not_exist(output_image, force=force)

    payload_type, payload_data, filename = build_payload(payload_text, payload_file)

    if encrypt:
        if not password:
            password = getpass.getpass("Password: ")
        if verbose:
            eprint("[info] Encrypting payload with AES-256-GCM ...")
        ciphertext, salt, nonce = aesgcm_encrypt(payload_data, password)
        payload_bytes = ciphertext
        encrypted = True
    else:
        payload_bytes = payload_data
        salt = None
        nonce = None
        encrypted = False

    # Build header
    channel_code = CHANNEL_CODES[channel]
    header = StegoHeader(
        bits=bits,
        channel_code=channel_code,
        encrypted=encrypted,
        payload_type=payload_type,
        filename=filename,
        payload_len=len(payload_bytes),
        salt=salt,
        nonce=nonce,
    )
    header_bytes = header.to_bytes()

    # Load and normalize image
    with Image.open(input_image) as img_in:
        img_in.load()
        img = normalize_image_for_channel(img_in, channel)
        width, height = img.size
        channels_used = compute_channels_used(channel)
        capacity_bytes = calc_capacity_bytes(width, height, channels_used, bits)

        total_needed = len(header_bytes) + len(payload_bytes)
        if total_needed > capacity_bytes:
            raise ValueError(
                (
                    "Insufficient capacity. Need {} ({} + header {}), but image can hold {}.\n"
                    "Try increasing --bits, using more channels (e.g., rgb/rgba), or a larger image."
                ).format(
                    human_size(total_needed),
                    human_size(len(payload_bytes)),
                    human_size(len(header_bytes)),
                    human_size(capacity_bytes),
                )
            )

        if verbose:
            eprint(
                f"[info] Image: {width}x{height} mode={img.mode} | Using channel={channel}, bits={bits} -> capacity {human_size(capacity_bytes)}"
            )
            eprint(
                f"[info] Header={len(header_bytes)} bytes, Payload={len(payload_bytes)} bytes, Total={total_needed} bytes"
            )

        # Build bitstream: header + payload
        writer = BitWriter()
        writer.write_bytes(header_bytes)
        writer.write_bytes(payload_bytes)

        # Embed
        if verbose:
            eprint("[info] Embedding bits into image ...")
        img_out = embed_bits_into_image(
            img=img,
            bits_per_channel=bits,
            channel=channel,
            data_bits=writer._bits,
        )

        # Save
        save_kwargs = {}
        fmt = out_format.upper()
        if fmt == "PNG":
            save_kwargs["compress_level"] = 0  # avoid any recompression issues
        if verbose:
            eprint(f"[info] Saving stego image to {output_image} (format={fmt}) ...")
        img_out.save(output_image, format=fmt, **save_kwargs)
        if verbose:
            eprint("[ok] Embed complete.")


def perform_extract(
    input_image: str,
    output_file: Optional[str],
    password: Optional[str],
    bits: Optional[int],
    channel: Optional[str],
    force_params: bool,
    verbose: bool,
) -> None:
    with Image.open(input_image) as img_in:
        img_in.load()
        # We will first assume a safe superset for reading header: use RGBA and 1 bit via RGB ordering.
        # Then parse header to know the actual bits/channel and re-read if necessary.
        # To do that, we need enough bits to reconstruct at least magic+version+header_len and the rest of header.
        # Since we don't know header length beforehand, we read a generous prefix using 1 bit RGB to rebuild bytes
        # and check magic. However, to be robust, we attempt reading using both RGB and RGBA if needed.

        # Strategy: Try to extract bytes assuming bits=1 and channel=rgb for the first N bytes (e.g., 256 bytes).
        # If magic found and header_len parsed, switch to actual bits/channel for the full extraction.

        def extract_prefix_bytes(img: Image.Image, channel_try: str, bits_try: int, num_bytes: int) -> bytes:
            reader = BitReader(extract_bits_from_image(img, bits_try, channel_try))
            bits_list = reader.read_bits(num_bytes * 8)
            return BitReader.bits_to_bytes(bits_list)

        img_rgb = normalize_image_for_channel(img_in, "rgb")
        prefix = extract_prefix_bytes(img_rgb, "rgb", 1, 512)
        if prefix[:8] != MAGIC or len(prefix) < 13:
            # Try RGBA path too (in case author used alpha channel only)
            img_rgba = normalize_image_for_channel(img_in, "rgba")
            prefix = extract_prefix_bytes(img_rgba, "rgba", 1, 512)

        if prefix[:8] != MAGIC:
            raise ValueError("Magic bytes not found; image may not contain a valid payload or parameters mismatch.")
        version = prefix[8]
        if version != VERSION:
            raise ValueError(f"Unsupported version: {version}")
        header_len = struct.unpack(">I", prefix[9:13])[0]
        need_total = 13 + header_len

        # Now that we know header size, read exact header using the (possibly) provided params.
        # If user forces params, respect them; else we need to discover from header.
        # To read header we still don't know actual bits/channel; but the header is small, so try a small loop
        # over plausible settings: try RGB and RGBA, bits 1..4 until header parses.

        def try_read_header_with_params(img: Image.Image, channel_try: str, bits_try: int) -> Optional[StegoHeader]:
            reader = BitReader(extract_bits_from_image(img, bits_try, channel_try))
            bits_list = reader.read_bits(need_total * 8)
            data = BitReader.bits_to_bytes(bits_list)
            try:
                return StegoHeader.parse(data[:need_total])
            except Exception:
                return None

        actual_header: Optional[StegoHeader] = None
        used_channel = None
        used_bits = None

        if force_params and bits is not None and channel is not None:
            img_norm = normalize_image_for_channel(img_in, channel)
            actual_header = try_read_header_with_params(img_norm, channel, bits)
            used_channel = channel
            used_bits = bits
            if actual_header is None:
                raise ValueError("Failed to parse header with forced parameters. They may be incorrect.")
        else:
            # Auto-detect
            for ch_try in ("rgb", "rgba", "r", "g", "b"):
                img_norm = normalize_image_for_channel(img_in, ch_try)
                for b_try in (1, 2, 3, 4):
                    actual_header = try_read_header_with_params(img_norm, ch_try, b_try)
                    if actual_header is not None:
                        used_channel = ch_try
                        used_bits = b_try
                        break
                if actual_header is not None:
                    break
            if actual_header is None:
                raise ValueError("Unable to auto-detect header. Consider providing --bits and --channel with --force-params.")

        if verbose:
            eprint(
                f"[info] Detected bits={actual_header.bits}, channel={REVERSE_CHANNEL_CODES.get(actual_header.channel_code, '?')} (using read params bits={used_bits}, channel={used_channel})"
            )

        # Now read entire header + payload using the actual used parameters (as embedded)
        img_norm = normalize_image_for_channel(img_in, used_channel)
        reader = BitReader(extract_bits_from_image(img_norm, used_bits, used_channel))
        bits_list = reader.read_bits((13 + header_len + actual_header.payload_len) * 8)
        data = BitReader.bits_to_bytes(bits_list)
        header_data = data[: 13 + header_len]
        header_parsed = StegoHeader.parse(header_data)
        payload_encrypted_or_plain = data[13 + header_len : 13 + header_len + header_parsed.payload_len]

        # Decrypt if necessary
        if header_parsed.encrypted:
            if not password:
                password = getpass.getpass("Password: ")
            if verbose:
                eprint("[info] Decrypting payload ...")
            try:
                plaintext = aesgcm_decrypt(
                    payload_encrypted_or_plain,
                    password,
                    header_parsed.salt or b"",
                    header_parsed.nonce or b"",
                )
            except Exception:
                raise ValueError("Decryption failed. Incorrect password or data corrupted.")
            payload_bytes = plaintext
        else:
            payload_bytes = payload_encrypted_or_plain

        # Output
        if output_file:
            # Respect provided output file; otherwise suggest header filename
            out_path = output_file
        else:
            if header_parsed.payload_type == PAYLOAD_TEXT:
                # Print as UTF-8 text to stdout
                try:
                    text = payload_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    text = payload_bytes.decode("utf-8", errors="replace")
                print(text)
                if verbose:
                    eprint("[ok] Extraction complete to stdout.")
                return
            else:
                # file payload; use original filename if available
                if header_parsed.filename:
                    out_path = header_parsed.filename
                else:
                    out_path = "extracted_payload.bin"

        with open(out_path, "wb") as f:
            f.write(payload_bytes)
        if verbose:
            eprint(f"[ok] Extraction complete. Wrote {len(payload_bytes)} bytes to '{out_path}'.")


# ----------------------------- CLI ----------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="stegolsb",
        description="LSB steganography tool to embed and extract data inside images (PNG/BMP).",
    )
    parser.add_argument("--verbose", action="store_true", help="Verbose logging")

    sub = parser.add_subparsers(dest="command", required=True)

    p_embed = sub.add_parser("embed", help="Embed (hide) a payload into an image")
    p_embed.add_argument("--input-image", required=True, help="Path to cover image (PNG/BMP preferred)")
    p_embed.add_argument("--output-image", required=True, help="Path to output stego image")
    p_embed.add_argument("--payload-file", help="Path to file to embed")
    p_embed.add_argument("--payload-text", help="Text string to embed")
    p_embed.add_argument("--encrypt", action="store_true", help="Encrypt payload with AES-256-GCM")
    p_embed.add_argument("--password", help="Password for encryption (if omitted and --encrypt used, prompt)")
    p_embed.add_argument("--bits", type=int, default=1, choices=[1, 2, 3, 4], help="Number of LSBs per channel (1-4)")
    p_embed.add_argument("--channel", choices=["rgb", "r", "g", "b", "rgba"], default="rgb", help="Channels to use")
    p_embed.add_argument("--format", choices=["png", "bmp"], default="png", help="Output image format")
    p_embed.add_argument("--allow-lossy", action="store_true", help="Allow lossy input images like JPEG (not recommended)")
    p_embed.add_argument("--force", action="store_true", help="Overwrite output image if it exists")

    p_extract = sub.add_parser("extract", help="Extract a payload from a stego image")
    p_extract.add_argument("--input-image", required=True, help="Path to stego image")
    p_extract.add_argument("--output-file", help="Save extracted payload to this file; default prints text to stdout")
    p_extract.add_argument("--password", help="Password for decryption (if required; prompt if omitted)")
    p_extract.add_argument("--bits", type=int, choices=[1, 2, 3, 4], help="Bits per channel used during embed (auto-detect by default)")
    p_extract.add_argument("--channel", choices=["rgb", "r", "g", "b", "rgba"], help="Channels used during embed (auto-detect by default)")
    p_extract.add_argument("--force-params", action="store_true", help="Force using provided --bits/--channel instead of auto-detecting from header")

    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    verbose: bool = getattr(args, "verbose", False)

    try:
        if args.command == "embed":
            perform_embed(
                input_image=args.input_image,
                output_image=args.output_image,
                payload_text=args.payload_text,
                payload_file=args.payload_file,
                encrypt=args.encrypt,
                password=args.password,
                bits=args.bits,
                channel=args.channel,
                out_format=args.format,
                allow_lossy=args.allow_lossy,
                force=args.force,
                verbose=verbose,
            )
        elif args.command == "extract":
            perform_extract(
                input_image=args.input_image,
                output_file=args.output_file,
                password=args.password,
                bits=args.bits,
                channel=args.channel,
                force_params=args.force_params,
                verbose=verbose,
            )
        else:
            parser.error("Unknown command")
        return 0
    except FileExistsError as ex:
        eprint(f"[error] {ex}")
        return 2
    except FileNotFoundError as ex:
        eprint(f"[error] File not found: {ex}")
        return 2
    except ValueError as ex:
        eprint(f"[error] {ex}")
        return 2
    except RuntimeError as ex:
        eprint(f"[error] {ex}")
        return 2
    except Exception as ex:
        eprint(f"[error] Unexpected error: {ex}")
        return 1


if __name__ == "__main__":
    sys.exit(main())


