# Ilmify

**Education That Reaches You**

Ilmify is a lightweight, browser-based interface for students to browse and download educational content (PDFs, textbooks, videos) in areas without internet access. Designed to run on a Raspberry Pi.

---

## 📁 Project Structure

```
ilmify/
├── content/                    # Educational content storage
│   ├── textbooks/             # PDF textbooks
│   ├── health-guides/         # Health-related PDFs
│   └── videos/                # Video lectures (MP4)
├── portal/                     # Web interface
│   ├── index.html             # Main dashboard
│   ├── css/
│   │   └── style.css          # Custom styles
│   ├── js/
│   │   └── main.js            # Frontend logic
│   ├── img/                   # Images (if needed)
│   └── data/
│       └── metadata.json      # Resource catalog
├── setup.sh                   # Setup script (creates folders)
├── indexer.py                 # Auto-indexing script
└── README.md                  # This file
```

---

## 🚀 Quick Start

### 1. Initial Setup

Run the setup script to create the folder structure:

```bash
# On Linux/Mac/Raspberry Pi
chmod +x setup.sh
./setup.sh

# On Windows (Git Bash)
bash setup.sh
```

### 2. Add Your Content

Copy your educational files to the appropriate folders:

- **PDFs (Textbooks)** → `content/textbooks/`
- **Health Guides** → `content/health-guides/`
- **Videos (MP4)** → `content/videos/`

### 3. Generate Metadata

Run the Python indexer to automatically catalog your content:

```bash
python3 indexer.py
```

This will scan all files and generate `portal/data/metadata.json`.

### 4. Start the Server

#### Option A: Python Simple Server (Recommended)
```bash
cd portal
python3 -m http.server 8080
```

#### Option B: Using Nginx (Production)
Configure Nginx to serve the `portal` directory.

### 5. Access the Portal

Open a web browser and navigate to:
```
http://localhost:8080
```

Or on other devices on the network:
```
http://<raspberry-pi-ip>:8080
```

---

## 📝 File Naming Convention

For best results, name your files descriptively:

- Use hyphens or underscores: `physics-class-9.pdf`
- The indexer converts filenames to titles:
  - `physics-class-9.pdf` → "Physics Class 9"
  - `first_aid_guide_pashto.pdf` → "First Aid Guide Pashto"

---

## 🔧 Configuration

### Supported File Types

| Extension | Format   | Category Folder    |
|-----------|----------|-------------------|
| `.pdf`    | PDF      | textbooks, health-guides |
| `.mp4`    | Video    | videos            |
| `.webm`   | Video    | videos            |
| `.mkv`    | Video    | videos            |
| `.avi`    | Video    | videos            |

### Adding New Categories

1. Create a new folder in `content/`
2. Update the `CATEGORY_MAPPING` in `indexer.py`
3. Add a category card in `index.html`
4. Run `python3 indexer.py`

---

## 🍓 Raspberry Pi Deployment

### Recommended Setup

1. **OS**: Raspberry Pi OS Lite (64-bit)
2. **Web Server**: Nginx or Python's built-in server
3. **Storage**: External USB drive for large content libraries

### Auto-start on Boot

Add to `/etc/rc.local` or create a systemd service:

```bash
cd /path/to/ilm-hotspot/portal && python3 -m http.server 80 &
```

### WiFi Hotspot Configuration

Configure the Raspberry Pi as a WiFi access point so students can connect directly without needing an existing network.

---

## 🌐 Features

- ✅ **Offline-first**: No internet required
- ✅ **Touch-friendly**: Large buttons for tablet use
- ✅ **Responsive**: Works on phones, tablets, and desktops
- ✅ **Search**: Filter resources by title
- ✅ **Categories**: Organized by content type
- ✅ **Auto-indexing**: Automatic metadata generation
- ✅ **Bilingual**: English and Urdu interface

---

## 📄 License

This project is open source and free to use for educational purposes.

---

## 🤝 Contributing

Feel free to contribute improvements! This project aims to bring education to underserved communities.

---

**Made with ❤️ for rural schools without internet access**
