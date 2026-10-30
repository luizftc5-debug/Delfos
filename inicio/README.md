# Delfos — página inicial (hero scroll-driven)

Publicada em <https://luizftc5-debug.github.io/Delfos/>. O HTML é o `index.html` da raiz do
repositório; tudo o que ele usa mora nesta pasta. Não depende de nada do painel (`dashboard/`),
só aponta para ele no botão **Abrir o Delfos**.

Notebook visto por trás → abre → tela preta → o D metálico sai da tela, sobe e flutua → legenda final.
Canvas + sequência de imagens, HTML/CSS/JS puro, sem dependências.

```
index.html (raiz)            ← a página: hero + "Quatro frentes" + rodapé
inicio/
├── css/delfos-hero.css      ← CSS do hero, prefixo .dh
├── css/pagina.css           ← o resto da página
├── js/delfos-hero.js        ← ES module; constantes ajustáveis no topo
├── assets/delfos-d.webp     ← camada do D com alpha
├── frames/desktop/          ← 239 × WebP 1920×1080  (~7,9 MB no total)
├── frames/mobile/           ← 239 × WebP 1080×648   (~4,2 MB no total)
└── scripts/
    ├── extract-frames.sh    ← comandos ffmpeg (desktop + mobile)
    └── cut-d.py             ← recorte do D a partir do último frame
```

## Rodar localmente

```bash
# na raiz do repositório
python3 -m http.server 8080
# abra http://localhost:8080
```
Precisa de servidor HTTP (o JS usa `fetch` e ES modules; `file://` não funciona).

## Integrar no seu site

1. **Copie as pastas** `css/`, `js/`, `assets/` e `frames/` para a pasta pública do site
   (ex.: `public/hero/` no Vite/Next/React, ou a raiz em site estático).
2. **No `<head>`**, adicione o CSS e os preloads do primeiro frame (ajuste o prefixo se usar `/hero/`):
   ```html
   <link rel="stylesheet" href="/hero/css/delfos-hero.css">
   <link rel="preload" as="fetch" crossorigin="anonymous" href="/hero/frames/mobile/frame_0001.webp"
         media="(max-width: 600px) and (prefers-reduced-motion: no-preference)" fetchpriority="high">
   <link rel="preload" as="fetch" crossorigin="anonymous" href="/hero/frames/desktop/frame_0001.webp"
         media="(min-width: 601px) and (prefers-reduced-motion: no-preference)" fetchpriority="high">
   ```
3. **No `<body>`**, cole o bloco entre `<!-- HERO DELFOS -->` e `<!-- /HERO DELFOS -->` do `index.html`
   como primeira seção da homepage. Troque os `src` para o prefixo certo (`/hero/assets/...`).
   O título final é `<h1>`: se a página já tiver um `<h1>`, troque por `<h2>`.
4. **Inicialize** (antes de `</body>`):
   ```html
   <script type="module">
     import { initDelfosHero } from '/hero/js/delfos-hero.js';
     initDelfosHero(document.querySelector('[data-delfos-hero]'), { basePath: '/hero/' });
   </script>
   ```
5. **Fundo**: deixe `html, body { background:#000 }` (ou pelo menos a seção seguinte começando em preto)
   para manter o preto contínuo.

### React / Next.js
```jsx
useEffect(() => {
  let hero;
  import('/hero/js/delfos-hero.js').then(({ initDelfosHero }) => {
    hero = initDelfosHero(ref.current, { basePath: '/hero/' });
  });
  return () => hero?.destroy();   // remove listeners, observers, rAF e libera a memória dos frames
}, []);
```
O JSX é o mesmo HTML do bloco (troque `class` → `className`). No Next, coloque os arquivos em `public/hero/`.

## Ajustes rápidos (topo de `js/delfos-hero.js`)

| Constante | O que faz |
|---|---|
| `SECTION_HEIGHT` | Altura da seção em vh (500). Mais = animação mais lenta. Se mudar, mude também `--dh-height` no CSS para evitar layout shift. |
| `EASE` | Suavidade do lerp (0.12). 0.08 = mais "amanteigado", 0.2 = mais responsivo. |
| `SCENE_RANGES` | Quando cada cena acontece (vídeo, troca para o D, subida, legendas). |
| `FIT` | Respiro do enquadramento; `padBottom` reserva a faixa das legendas. |
| `D_LAYER` | Posição final, tamanho, giro, flutuação e brilho do D. |
| `DECODE_WINDOW` | Quantos frames ficam decodificados à frente/atrás (memória × fluidez em scroll muito rápido). |
| `TOTAL_FRAMES`, `SOURCES` | Se reextrair o vídeo. |

Textos: edite direto no HTML (`.dh__cap`). As faixas de cada legenda são `SCENE_RANGES.captions`, na mesma ordem.

## Decisões técnicas (por quê)

- **24 fps, não 30.** O vídeo é 24 fps nativo. Extrair a 30 só duplicaria frames (+25% de download, nenhum ganho).
- **Recorte mobile em paisagem, não portrait.** Um recorte 9:16 cortaria o notebook. O set mobile recorta só a
  área segura (1080×648) e o canvas faz *contain* dela; o resto da tela é o mesmo preto.
- **Enquadramento = contain da área segura.** `SAFE_AREA` é a união do bounding box do notebook + D nos 239 frames.
  Ela sempre cabe inteira na tela; o fundo preto excedente pode sangrar (efeito *cover*). Topo da tampa nunca corta.
- **Sem decode na thread principal.** Os frames ficam como Blob comprimido; só uma janela ao redor do frame atual
  vira `ImageBitmap` (decodificado fora da thread principal, já no tamanho de tela). No teste com CPU 4× mais lenta, isso
  zerou ~4,3 s de "Decode Image" na thread principal que a abordagem clássica com `<img>` gerava.
- **Camada do D = recorte do último frame.** Mesma geometria do D no canvas (desvio medido < 0,1 px no desktop,
  ~0,2 px CSS no mobile). O canvas só começa a se dissolver quando a camada já está por cima → nenhum quadro sem D.
- **Sem GSAP.** O scroll é só `scrollY` → progresso → lerp; GSAP/ScrollTrigger (~70 KB) não traria nada aqui.
- **Movimento reduzido:** seção com 100svh, só o frame final + legenda final, e apenas 1 frame é baixado.

## Limitações conhecidas

- O D é um recorte 464×552 do vídeo 1080p. Na tela cheia de notebook (~460 px de altura, @2x) ele fica levemente
  menos nítido que um vetor. Para nitidez máxima: exporte o D em PNG 4K com alpha do mesmo arquivo 3D que gerou o
  vídeo (ou um GLB para three.js) e troque `assets/delfos-d.webp` mantendo a proporção.
- Em scroll extremamente rápido (atravessar a seção inteira em ~1 s), por alguns quadros aparece um frame-chave em
  meia resolução até o frame exato decodificar — é a rede de segurança contra "buracos".
