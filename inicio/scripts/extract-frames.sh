#!/usr/bin/env bash
# Converte o vídeo do hero em sequência de frames WebP (desktop + mobile).
# Uso: bash scripts/extract-frames.sh caminho/do/video.mp4
set -euo pipefail

VIDEO="${1:?informe o caminho do .mp4}"

# FPS = taxa NATIVA do vídeo. Este arquivo é 24 fps (239 frames).
# Extrair a 30 fps só duplicaria 1 a cada 4 frames: +25% de peso, zero de fluidez a mais.
# Se trocar o vídeo, confira com:  ffprobe -v error -show_entries stream=r_frame_rate -of csv=p=0 video.mp4
FPS=24

# Leve correção de pretos (≈9/255 → 0): o fundo do vídeo vira #000 puro e funde com a página.
GRADE="colorlevels=rimin=0.035:gimin=0.035:bimin=0.035"

# WebP qualidade 80, compressão máxima (encode mais lento, arquivo menor; não afeta o decode).
WEBP="-c:v libwebp -quality 80 -compression_level 6 -preset picture"

mkdir -p frames/desktop frames/mobile

# Desktop: 1920 px de largura (16:9 completo).
ffmpeg -y -i "$VIDEO" -an -vf "fps=$FPS,$GRADE,scale=1920:-2:flags=lanczos" $WEBP frames/desktop/frame_%04d.webp

# Mobile: 1080 px de largura, recorte próprio = só a ÁREA SEGURA do notebook (corta o preto vazio).
# 1720×1032 → 1080×648 é escala exata (sem arredondamento), o que mantém o alinhamento com a camada do D.
# Por que não um recorte portrait 9:16? Porque ele cortaria o notebook (ele ocupa ~82% da largura
# do quadro em vários frames). Em portrait o canvas faz "contain" desta área e o preto preenche o resto.
ffmpeg -y -i "$VIDEO" -an -vf "fps=$FPS,$GRADE,crop=1720:1032:100:24,scale=1080:648:flags=lanczos" $WEBP frames/mobile/frame_%04d.webp

echo "Frames: $(ls frames/desktop | wc -l) (atualize TOTAL_FRAMES no js se mudar)"
du -sh frames/desktop frames/mobile
