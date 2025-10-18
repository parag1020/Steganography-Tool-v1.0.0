# 🔐 Steganography Tool - Hide Secrets in Plain Sight

A powerful, dual-interface steganography tool that allows you to hide text and files inside images using Least-Significant-Bit (LSB) steganography with optional AES-256-GCM encryption.

![Steganography Tool](https://img.shields.io/badge/Steganography-LSB%20Tool-00E0C7?style=for-the-badge&logo=security&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

### 🖥️ **Dual Interface**
- **Command Line Tool**: Python-based CLI for advanced users
- **Web Interface**: Modern React-based GUI with cyber-security aesthetic

### 🔒 **Security Features**
- **LSB Steganography**: Hide data in image pixels
- **AES-256-GCM Encryption**: Military-grade encryption for sensitive data
- **PBKDF2 Key Derivation**: 200,000 iterations for password security
- **Cross-Platform Compatibility**: Python ↔ Web frontend file exchange

### 🎨 **Modern UI**
- **Dark Theme**: Professional cyber-security aesthetic
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion powered transitions
- **Toast Notifications**: Professional success/error feedback
- **Image Persistence**: Upload once, use across tabs

### 🛠️ **Technical Features**
- **Multiple Image Formats**: PNG, BMP (lossless recommended)
- **Configurable LSB**: 1-4 bits per channel
- **Channel Selection**: RGB, RGBA, or individual channels
- **Capacity Calculation**: Real-time storage estimation
- **File Support**: Text messages and binary files

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (for CLI tool)
- **Node.js 16+** (for web interface)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/parag1020/Steganography-Tool-v1.0.0.git
cd Steganography-Tool-v1.0.0
```

#### 2. Python Backend Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Web Frontend Setup
```bash
cd web
npm install
npm run dev
```

## 📖 Usage

### Command Line Interface

#### Basic Text Embedding
```bash
python stegolsb.py embed --input-image examples/cover.png --output-image secret.png --payload-text "Hello, hidden world!"
```

#### Extract Hidden Text
```bash
python stegolsb.py extract --input-image secret.png
```

#### Encrypted File Embedding
```bash
python stegolsb.py embed --input-image examples/cover.png --output-image encrypted.png --payload-file secret.txt --encrypt --password "mypassword"
```

#### Extract Encrypted File
```bash
python stegolsb.py extract --input-image encrypted.png --output-file recovered.txt --password "mypassword"
```

### Web Interface

1. **Open your browser** to `http://localhost:5173`
2. **Upload an image** using the drag-and-drop zone
3. **Choose your mode**:
   - **Embed**: Hide text or files in images
   - **Extract**: Recover hidden data from images
4. **Configure settings**:
   - LSB bits (1-4)
   - Color channels (RGB, RGBA, etc.)
   - Encryption (optional)
5. **Process and download** your results

## 🔧 Advanced Configuration

### LSB Parameters
- **Bits**: 1-4 least significant bits per channel
- **Channels**: RGB (3), RGBA (4), or individual R/G/B
- **Capacity**: Automatically calculated based on image size

### Encryption Settings
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2-HMAC-SHA256
- **Iterations**: 200,000 (industry standard)
- **Salt & Nonce**: Cryptographically secure random generation

## 📁 Project Structure

```
steganography-tool/
├── README.md                 # This file
├── LICENSE                   # MIT License
├── .gitignore               # Git ignore rules
├── stegolsb.py              # Python CLI tool
├── requirements.txt          # Python dependencies
├── examples/                # Sample files
│   ├── cover.png            # Sample cover image
│   └── secret.txt           # Sample secret file
├── tests/                   # Test files
│   └── test_embed_extract.py
└── web/                     # React web application
    ├── package.json         # Node.js dependencies
    ├── src/
    │   ├── App.jsx          # Main app component
    │   ├── context/         # React context for state
    │   ├── components/      # UI components
    │   └── utils/          # LSB steganography logic
    └── public/              # Static assets
```

## 🧪 Testing

### Python Backend Tests
```bash
python tests/test_embed_extract.py
```

### Web Frontend Tests
```bash
cd web
npm test
```

## 🔒 Security Considerations

### Ethical Use
This tool is designed for:
- ✅ **Educational purposes**
- ✅ **Legitimate privacy protection**
- ✅ **Security research**
- ✅ **Digital forensics training**

### ⚠️ **DO NOT USE FOR**:
- ❌ Hiding malicious content
- ❌ Evading law enforcement
- ❌ Violating others' rights
- ❌ Processing images you don't own

### Best Practices
1. **Use strong passwords** for encryption
2. **Keep your keys secure** - if lost, data is unrecoverable
3. **Use lossless formats** (PNG, BMP) for embedding
4. **Test extraction** before relying on hidden data
5. **Only process images you own** or have permission to modify

## 🛠️ Development

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Building for Production
```bash
# Web frontend
cd web
npm run build

# Python package
python setup.py sdist bdist_wheel
```

## 📊 Performance

### Capacity Examples
- **1024×1024 PNG, RGB, 1 LSB**: ~384 KB
- **1024×1024 PNG, RGB, 2 LSB**: ~768 KB
- **1024×1024 PNG, RGB, 3 LSB**: ~1.1 MB
- **1024×1024 PNG, RGB, 4 LSB**: ~1.5 MB

### Supported Formats
- **Input**: PNG, BMP (recommended), JPEG (not recommended)
- **Output**: PNG, BMP
- **Payload**: Text, binary files, encrypted data

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/parag1020/Steganography-Tool-v1.0.0/issues)
- **Discussions**: [GitHub Discussions](https://github.com/parag1020/Steganography-Tool-v1.0.0/discussions)
- **Documentation**: [Wiki](https://github.com/parag1020/Steganography-Tool-v1.0.0/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PIL (Pillow)** for image processing
- **Cryptography** for encryption algorithms
- **React** for the web interface
- **Framer Motion** for animations
- **Tailwind CSS** for styling

---

## 👨‍💻 **Author**

**Parag Patel**
- 🔗 **LinkedIn**: [parag-patel-9593742a7](https://www.linkedin.com/in/parag-patel-9593742a7)
- 🐙 **GitHub**: [parag1020](https://github.com/parag1020)

---

**Made with ❤️ for the security community**

*Remember: With great power comes great responsibility. Use this tool ethically and legally.*