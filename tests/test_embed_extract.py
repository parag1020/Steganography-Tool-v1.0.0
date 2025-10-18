import os
from PIL import Image
import subprocess
import sys


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr


def test_embed_extract_text():
    # Create a small cover image
    os.makedirs("examples", exist_ok=True)
    cover_path = "examples/cover.png"
    img = Image.new("RGB", (100, 100), color=(128, 128, 128))
    img.save(cover_path, format="PNG")

    stego_path = "examples/stego.png"
    payload_text = "hello stego"

    # Embed
    rc, out, err = run([sys.executable, "stegolsb.py", "embed",
                        "--input-image", cover_path,
                        "--output-image", stego_path,
                        "--payload-text", payload_text,
                        "--bits", "1",
                        "--channel", "rgb",
                        "--format", "png",
                        "--force"])
    assert rc == 0, f"embed failed: {err}"
    assert os.path.exists(stego_path)

    # Extract (stdout)
    rc, out, err = run([sys.executable, "stegolsb.py", "extract",
                        "--input-image", stego_path])
    assert rc == 0, f"extract failed: {err}"
    assert payload_text in out


if __name__ == "__main__":
    test_embed_extract_text()
    print("OK")





