# komu

<div align="center">
  <img src="frontend/public/icon-512.png" alt="Komu Manga Reader" width="120" height="120" style="border-radius: 20px;">
  
  **A kawaii self-hosted manga reader for Japanese learning! Supports English and Chinese.**
  
</div>


<div align="center">
  
<img src="screenshots/desktop1.png" alt="Library View" width="800" style="margin: 10px; border-radius: 12px;">
<img src="screenshots/mobile1.png" alt="Upload Interface" width="300" style="margin: 10px; border-radius: 12px;">
<img src="screenshots/mobile2.png" alt="Reading Mode" width="300" style="margin: 10px; border-radius: 12px;">
<img src="screenshots/mobile3.png" alt="Text Overlay" width="300" style="margin: 10px; border-radius: 12px;">
<img src="screenshots/mobile4.png" alt="Grammar Breakdown" width="300" style="margin: 10px; border-radius: 12px;">
<img src="screenshots/mobile5.png" alt="Text Analysis" width="300" style="margin: 10px; border-radius: 12px;">
<img src="screenshots/mobile6.png" alt="Settings Page" width="300" style="margin: 10px; border-radius: 12px;">

</div>

## Features

- **Import PDFs/Images**: Drag & drop manga PDFs/images to add to your library
- **Dialogue OCR**: Dialogue text recognition in the background (using [manga-ocr](https://github.com/kha-white/manga-ocr))
- **Grammar Breakdown**: Break down the dialogue into tokens with furigana and part-of-speech highlighting (using [ichiran](https://github.com/tshatrov/ichiran))
- **AI-driven Q&A**: Select words and ask Komi (our kanban girl) to explain them in the context of the dialogue
- **Responsive UI**: Works on both desktop and mobile
- **3 Reading Modes**: RTL/LTR page navigation and vertical scrolling
- **PWA Support**: Can be added to home screen as an app on both iOS and Android

## Tech Stack

- **Frontend**: React 18 + Vite + shadcn/ui + framer-motion
- **Backend**: Elysia + Bun + SQLite + Prisma
- **Japanese Tokenization**: [ichiran](https://github.com/tshatrov/ichiran)
- **OCR Inference**: FastAPI + [manga-ocr](https://github.com/kha-white/manga-ocr) + [comic-text-detector](https://github.com/dmMaze/comic-text-detector)

## Quick Start

### Installation

**Linux / WSL**

1. Install **Docker** following the instructions on the [official website](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository).

Start Docker:

```bash
systemctl start docker
# or
sudo /etc/init.d/docker start
```

Install **Node.js 18+** following the instructions on the [official website](https://nodejs.org/en/download).

And finally, install **PyTorch** following the instructions on the [official website](https://pytorch.org/get-started/locally/).

2. Run the following commands to install Git LFS, Bun, and ImageMagick.

```bash
# Install Git LFS
sudo apt install git-lfs

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install ImageMagick
sudo apt install imagemagick graphicsmagick
```

4. Clone the repository and install dependencies.

```bash
# Setup project (Important: --recurse-submodules to clone submodules in the packages folder!)
git clone --recurse-submodules https://github.com/TigerHix/komu.git
cd komu

# Install frontend & backend dependencies
cd frontend && bun install && cd ..

cd backend
cp .env.example .env
bun install && bunx prisma generate && bunx prisma db push
sudo apt-get install -y poppler-utils
cd ..

# Create Python virtual environment for inference service
# Need to create at the project root directory!
python -m venv .venv
source .venv/bin/activate
cd inference
cp .env.example .env
pip install -r requirements.txt
cd ..
```

5. To use the LLM-powered features, request an API key from [OpenRouter](https://openrouter.ai/) and add it to the `backend/.env` file. You may also customize the LLM model (`CHAT_MODEL`, `SEARCH_MODEL`).


**Windows & macOS**

**TODO.** Should be highly similar to the above.

### Running the Application

**Linux / WSL**

```bash
# Terminal 1: Frontend  
cd frontend && bun run dev

# Terminal 2: Backend
cd backend && bun run dev

# Terminal 3: Inference Service
cd inference && bash ./start_service.sh
```

⚠️ **First-time setup note**: The initial Docker build & run for ichiran (grammar analysis service) takes approximately 5 minutes. Grammar breakdown features will become available once you see "✅ Ichiran service ready!" in the console. If the build exceeds 10 minutes, please check if the build is stuck or increase the timeout in [backend/src/lib/ichiran-service.ts](backend/src/lib/ichiran-service.ts).

In your browser, go to `http://localhost:5847` to access Komu.

We recommend using a VPN such as [Tailscale](https://tailscale.com/) to access the application from your other devices.

## Contributing

This project was pretty much vibe-coded in a few days so beware of the code quality! We invite you to vibe together using [Claude Code](https://www.anthropic.com/claude-code). Just don't spend too much money on it...

## License

Everything except Komi's visual assets are licensed under the [GPL-3.0](LICENSE).

Character Designer & Illustrator: [@凛星Rin](https://weibo.com/u/3533612514)