# Runtime de IA local

WebLLM **0.2.86**, Apache-2.0, com loglevel **1.9.2**, MIT. Fontes:
https://github.com/mlc-ai/web-llm e https://github.com/pimterry/loglevel.
Os avisos de licença acompanham esta pasta.

`webllm.js` é um bundle ESM gerado, carregado pelo worker apenas ao escolher a IA.
Reproduzir, a partir da raiz do repositório:

```sh
npm ci --prefix tools/ia-local
npm run build --prefix tools/ia-local
```

O worker usa Qwen2.5-0.5B-Instruct quantizado em 4 bits, nas distribuições públicas
MLC q4f16_1 ou q4f32_1, conforme suporte a shader-f16 do aparelho. Modelo original:
https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct (Apache-2.0).
Os pesos e a biblioteca WebGPU do modelo são baixados dos endereços fixados no
registro do WebLLM (Hugging Face e GitHub). Não acompanham este bundle.
Nenhuma inferência é solicitada a esses serviços: os textos permanecem no worker local.

WebGPU, contexto seguro, memória gráfica e espaço de cache são necessários.
O site não baixa o modelo ao abrir a página ou ao montar uma aba manualmente.
