export const COMMON_PROMPT = `Transform the person in the reference image into an original premium 3D animated chibi monster character with a clearly non-human silhouette. The result must feel like a full creature redesign, not a human wearing horns, makeup, or a costume. Preserve the subject’s pose, facial expression, hairstyle, bangs, outfit silhouette, outfit colors, and important props so the original person is still recognizable, but reinterpret the face and body as a cute fantastical monster. Use a bigger chibi head, shorter body, rounded torso, tiny creature legs, monster hands or paws, creature feet, large ears, tail, and species-specific horns or fantasy details. Keep the eyes expressive and the emotion recognizable, but reduce realistic human facial structure and avoid realistic human skin, realistic human hands, or plain human anatomy. Do not leave a realistic human nose bridge, human lips, human jawline, human cheek structure, realistic fingers, or human-length limbs as the dominant read. The final character should read first as a mascot creature, only secondarily as the original person.

Human-looking skin tone must not remain visible as the main surface. Replace the subject’s skin color with the monster’s own body palette, and replace human skin texture with creature materials such as plush fur, velvety beast hide, soft scales, glossy imp skin, moon-dusted skin, bark-moss texture, or other clearly non-human finishes that match the selected monster type. Hands, cheeks, forehead, ears, neck, legs, and any visible body surface should read as creature skin, fur, scales, plush, bark, or fantasy hide rather than ordinary human skin. If any original skin tone shows through, reinterpret it as monster markings, glowing blush, freckles, paw pads, scale gradients, or magical surface accents instead of leaving it human. Human-like fingers should become paws, claws, mitt-like mascot hands, or short creature digits. Human-like legs should become short creature legs or mascot limbs with obvious non-human proportions. The face should keep the subject’s mood and hairstyle, but the structural read must become creature muzzle, plush cheeks, monster brow, fantasy ears, and simplified mascot geometry instead of a human portrait.

Generate the background as well as the character. Do not preserve the original location. Instead, create a new cinematic fantasy environment where the selected monster would naturally live. The background should match the monster type, body palette, textures, and personality, and should feel like a polished storybook world with depth, glow, atmosphere, and family-friendly 3D animated charm. The world should feel cohesive, magical, and original, with layered foreground and background elements, soft depth of field, and lighting that supports the character design.

The monster body colors should harmonize with the subject’s outfit colors. Clothing should remain clearly recognizable, but it should sit naturally on the transformed creature body. Prioritize strong creature silhouette, readable monster anatomy, and adorable stylized deformation over realism. Aim for a premium storybook-mascot finish with plush volume, velvety or softly glossy materials, saturated accent glows, and instantly readable oversized creature features such as ears, horns, tails, paws, and cheek markings. Do not copy or closely imitate any existing copyrighted character, movie, franchise, or studio design.`;

export const PROMPT_VARIANTS = {
  A: {
    code: "A",
    name: "Fluffy Beast",
    prompt: `Fluffy Beast Monster
Create a plush fluffy beast version of the subject with a strong creature silhouette. The body should look like a soft storybook monster: oversized head, extra-round cheeks, short neck, compact torso, fluffy shoulders, thick paws, rounded clawed feet, a plush tail, giant soft ears, and short curved horns. The creature should feel more like a tiny magical beast cub than a person.

The face should be simplified and monster-like rather than realistic human. Keep the subject’s hairstyle and expression recognizable, but place them on a soft beast face with a tiny beast muzzle, extra-wide plush cheeks, expressive oversized eyes, little fangs, and a friendly mischievous smile. Replace any human skin with dense plush fur, velvety beast hide, fuzzy cheek fluff, colored paw pads, and soft muzzle gradients. Avoid realistic human jawlines, realistic hands, long human limbs, or a mostly human face. Push the body toward a plush cub mascot with mitten-like paws, stumpier legs, fuller cheek volume, and more beast than person.

Use outfit colors to drive the beast palette so the fur, skin, paw pads, horn accents, and tail markings coordinate with the clothing. Build a cozy fantasy habitat such as a glowing den, snowy forest clearing, moonlit nest valley, or soft lantern-lit woodland that feels warm, magical, and cinematic. Favor plush cub-like proportions, soft fur volume, fully fur-covered limbs, and a front-readable mascot silhouette similar to a premium storybook creature portrait.`,
  },
  B: {
    code: "B",
    name: "Little Dragon",
    prompt: `Little Dragon Monster
Create a cute but unmistakably dragon-like version of the subject. Give the character a thick chibi dragon body with a rounded belly, sturdy little legs, clawed hands, a long heavy tail, curved horns, pointed ears, tiny wings, and visible scale shapes across the cheeks, arms, tail, and feet. The overall result should read immediately as a baby dragon or little fantasy reptile, not a human child with accessories.

Keep the subject’s hairstyle, bangs, expression, and clothing recognizable, but convert the face and body into a creature design with a tiny snout, bigger cheeks, oversized luminous eyes, soft fangs, and stylized dragon anatomy. Replace human skin tone with dragon hide, pearly scales, scale gradients, glowing horn bases, reptile paw surfaces, and leathery wing membranes. Reduce realistic human proportions and make the horns, tail, scales, creature feet, and non-human skin texture clearly visible. Do not leave a human child face with dragon accessories; the read should be hatchling dragon first, with shortened reptile limbs, chunkier paws, thicker tail mass, and a simplified creature muzzle.

Use the outfit palette to choose the dragon’s base skin, horn glow, scale accents, and wing membranes. Build a world that suits a young dragon, such as glowing caves, ember-lit ruins, misty cliffside nests, crystal valleys, or magical hatchling sanctuaries with cinematic depth and fantasy atmosphere. Favor a hatchling-dragon read with a round belly, visible tail weight, scaled cheeks and limbs, horn silhouette, and unmistakable creature anatomy at a glance.`,
  },
  C: {
    code: "C",
    name: "Forest Creature",
    prompt: `Forest Creature Monster
Create a whimsical forest creature version of the subject with a silhouette that feels half beast, half woodland spirit. Add large leaf-like ears, twig or antler horns, tiny antennae or sprouts, mossy or velvety fur patches, bark-like markings on the limbs, rounded claws, and a flexible tail decorated with leaves, petals, or glowing spores. The body should feel compact, plush, and distinctly magical.

Preserve the subject’s hairstyle, expression, and clothing identity, but reinterpret the face as a gentle forest monster with rounded cheeks, oversized eyes, tiny fangs, and non-human proportions. Replace any remaining human skin with moss-tinted hide, bark-soft texture, velvety woodland fur, petal blush, glowing spores, and softly bioluminescent fantasy skin. Avoid a realistic human face on a creature body. Make the hands, feet, ears, tail, and visible skin surfaces obviously fantastical. Push the silhouette toward a woodland mascot with branchlet horns, plush limbs, creature paws, and a softened muzzle so the result never reads as a human person simply painted green.

Blend the subject’s clothing colors with mossy greens, flower colors, soft bark browns, misty teals, or bioluminescent accents. Place the creature in a rich enchanted woodland scene such as a glowing grove, storybook forest tunnel, mossy glade, luminous mushroom path, or magical hidden clearing full of depth and tiny environmental details. Favor oversized ears, curled tail rhythm, glowing forest depth, and fully transformed woodland textures similar to a premium fairy-tale creature portrait.`,
  },
  D: {
    code: "D",
    name: "Starry Night",
    prompt: `Starry Night Monster
Create a dreamy celestial monster version of the subject with a clearly creature-like chibi body. Add oversized crescent horns, broad moonlit ears, tiny glowing fangs, rounded paws or claws, a curled tail with star markings, and luminous freckles or constellation patterns across the body. The design should feel like a night-sky creature from a magical story world, not a realistic person.

Keep the subject’s hairstyle, expression, and clothing easy to recognize, but reinterpret the face with softer monster proportions, huge expressive eyes, rounded cheeks, and luminous non-human details. Replace human skin with moon-dusted creature skin, velvet night-sky gradients, subtle nebula textures, glowing freckles, and starlit paw or claw surfaces. Reduce realistic human anatomy and emphasize chibi monster deformation, especially in the horns, ears, tail, compact body, and celestial surface treatment. Avoid a human face under star makeup; the final read should be a tiny celestial creature with plush-cosmic limbs, a simplified moon-beast muzzle, and mascot-like proportions.

Use outfit colors to inform the celestial palette, then enrich it with moonlight blues, twilight purples, stardust pinks, or nebula glows. Create an atmospheric cosmic environment such as a moonlit observatory forest, floating star platform, dreamy night campsite, tiny planet meadow, or sparkling celestial valley with cinematic lighting and depth. Favor a centered celestial-creature read with luminous horn shapes, glowing tail accents, a dramatic cosmic pedestal or moonlit stage, and skin that feels fully transformed into magical night matter.`,
  },
  E: {
    code: "E",
    name: "Candy Imp",
    prompt: `Candy Imp Monster
Create a playful candy-colored imp version of the subject with an unmistakably creature-like silhouette. Give the character shiny curved horns, giant pointed ears, rounded claws, chunky little monster feet, a springy curled tail, cheek markings, and glossy candy-like skin or scales. The body should feel compact, lively, and highly stylized, like a tiny mischievous fantasy snack-monster.

Preserve the subject’s hairstyle, expression, and outfit identity, but turn the face and body into a real creature design with soft monster cheeks, big bright eyes, tiny fangs, and simplified non-human anatomy. Replace any human skin with glossy candy skin, jelly-like gradients, sugar-sheen scales, frosting blush, syrupy highlights, or taffy-soft imp textures. Avoid a mostly human face or body. Make the transformation feel complete, adorable, and materially non-human. Push the result toward a chewy imp mascot with shortened limbs, chunky creature feet, simplified candy-muzzle features, and obvious non-human ear-horn-tail rhythm instead of a human silhouette.

Let the outfit palette guide the base colors, then amplify them with pastel candy accents, syrup glows, frosting-like textures, or bright confectionery patterns. Build a vivid candy fantasy world such as a sweet village, rainbow dessert canyon, pastel festival street, lollipop forest, or whimsical candy campsite that feels rich, cinematic, and magical. Favor bold candy-land color separation, giant readable ears, cheek markings, glossy transformed skin surfaces, and a playful mascot silhouette that feels instantly non-human.`,
  },
} as const;

export type PromptVariantCode = keyof typeof PROMPT_VARIANTS;

export const PROMPT_CODES = Object.keys(PROMPT_VARIANTS) as PromptVariantCode[];
