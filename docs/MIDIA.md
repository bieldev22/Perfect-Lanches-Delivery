# Mídia do delivery

A paleta usa o preto e o dourado da logomarca fornecida, com creme e tons quentes para leitura e conteúdo. O logotipo foi recortado da captura enviada pelo usuário. Para impressão ou tamanhos grandes, substitua-o pelo arquivo original da marca.

O fluxo de categorias, detalhes, observações e adição ao carrinho foi inspirado no vídeo de referência enviado. Os arquivos de referência intermediários ficam fora do código publicado.

## Imagem de destaque

[public/media/hero.webp](../public/media/hero.webp), com variações recortadas para o Double Perfect e o Perfect Bacon, deriva de uma imagem criada pela ferramenta integrada **image_gen**. A imagem foi copiada para o projeto, sem dependência do diretório de geração da ferramenta.

Prompt de geração:

> Use case: product-mockup. Asset type: hero photograph for Perfect Lanches, a Brazilian handmade burger delivery website with black and warm gold branding. Create a premium, photorealistic food photograph, wide landscape 1536x1024 composition: one irresistible large double smashed beef burger on a dark brown rustic wooden board, shiny golden brioche bun, two beef patties with melted cheddar, crispy bacon, sliced pickles and subtle house sauce, a generous portion of golden French fries beside it. Three quarter close viewpoint, studio food photography, dark charcoal seamless backdrop, dramatic warm golden rim light and soft natural key lighting, rich texture, appetizing steam, crisp bread and juicy beef, a few tiny sesame seeds on table. Burger centered in the right half with breathing space around it, deep black shadow on left blending naturally for adjacent text overlay. No people, no hands, no lettering, no logos, no frame, no collages, no watermark. Realistic artisanal Brazilian burger, elegant restaurant editorial quality.

## Fotografias complementares

Fotografias ilustrativas obtidas do Unsplash, baixadas para o projeto e convertidas para WebP. Os identificadores de cada arquivo e o procedimento de obtenção estão em [scripts/prepare-media.mjs](../scripts/prepare-media.mjs). Entre as fontes conferidas:

- [Brownies — Suchandra Varma](https://unsplash.com/photos/a-close-up-of-a-tray-of-brownies-with-chocolate-drizzled-on-Ized6jKLKm8)
- [Pudim — Felippe Lopes](https://unsplash.com/pt-br/fotografias/uma-pequena-sobremesa-em-um-prato-branco-em-uma-mesa-de-madeira-TqPdzQ00I0U)
- [Batatas rústicas — Karyna Panchenko](https://unsplash.com/es/fotos/una-sarten-llena-de-patatas-cocidas-encima-de-una-mesa-ZXKhl8EROU0)

As latas são ilustrações de embalagem criadas em SVG e renderizadas em WebP pelo script de mídia. Não são fotografias oficiais dos fabricantes. As fotos e os ingredientes do cardápio são ilustrativos e precisam ser conferidos pela cozinha antes do uso comercial.

## Vídeos e fontes

Os 15 MP4 são prévias de três segundos com efeito de aproximação da foto correspondente, gerados por [scripts/prepare-videos.py](../scripts/prepare-videos.py), com FFmpeg via `imageio-ffmpeg`. Esse recurso permite conferir o comportamento solicitado sem apresentar as animações como filmagens reais dos produtos. Para recriar os vídeos, instale `imageio-ffmpeg` no Python e execute o script. Na operação, o administrador pode enviar os vídeos reais pelo painel.

As fontes Outfit e DM Sans foram obtidas do Google Fonts e são servidas localmente. [scripts/download-fonts.mjs](../scripts/download-fonts.mjs) reproduz a obtenção. As licenças acompanham o projeto: [Outfit](licenses/Outfit-OFL.txt) e [DM Sans](licenses/DM-Sans-OFL.txt). A navegação do cliente não depende de imagens ou fontes remotas.
