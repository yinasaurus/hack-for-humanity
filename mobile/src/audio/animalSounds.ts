import type { SelectablePetTypeId } from '../pets';

const PET_LABELS: Record<SelectablePetTypeId, string> = {
  fox: 'Fox',
  horse: 'Horse',
  parrot: 'Parrot',
  flamingo: 'Flamingo',
  stork: 'Stork',
  dog: 'Dog',
  cat: 'Cat',
  panda: 'Panda',
  penguin: 'Penguin',
  capybara: 'Capybara',
  rabbit: 'Rabbit',
  koala: 'Koala',
  bear: 'Bear',
  raccoon: 'Raccoon',
  duck: 'Duck',
  sheep: 'Sheep',
  seal: 'Seal',
  sloth: 'Sloth',
};

/**
 * A bundled call is deliberately a local Metro asset. Remote URLs are not
 * accepted here: animal calls should remain available offline and their
 * provenance must be reviewable alongside the app binary.
 */
// Native Metro resolves a static require() to a numeric asset id. Expo web
// resolves the same static asset to a URL string; both are valid AudioSource
// and Expo Asset inputs.
export type AnimalSoundSource = number | string | null;

export type AnimalSoundKind = 'talk' | 'play';

export type AnimalSoundTrack = 'pilot' | 'backlog';

export type AnimalSoundStatus = 'ready' | 'pilot-pending' | 'backlog';

export type AnimalSoundProvenance = {
  /** The page or archive record from which the exact recording was obtained. */
  sourceUrl: string | null;
  /** Exact downloadable file/preview used for the bundled derivative. */
  acquisitionUrl?: string;
  /** The recording author / uploader, not the animal species label. */
  author: string | null;
  /** Only CC0, CC-BY, or public-domain recordings may enter this manifest. */
  license: 'CC0' | 'CC-BY' | 'Public-Domain' | null;
  /** Processing applied after download, such as trim, fade, or normalization. */
  modifications: string | null;
  /** SHA-256 of the exact bundled file, represented in lowercase hex. */
  sha256: string | null;
  downloadDate: string | null;
};

export type AnimalSoundEntry = {
  species: SelectablePetTypeId;
  kind: AnimalSoundKind;
  track: AnimalSoundTrack;
  status: AnimalSoundStatus;
  /** Metro `require()` result once a verified file is added; null means silent. */
  source: AnimalSoundSource;
  /** Measured file duration, not a guessed renderer timeout. */
  durationMs: number | null;
  /** Compressed file size in bytes, kept in the catalog for the size gate. */
  byteSize: number | null;
  provenance: AnimalSoundProvenance;
  warnings: readonly string[];
};

/*
 * Metro requires literal require() calls for local assets. The fallback is
 * only used by Node's manifest tests, where no Metro asset registry exists;
 * the native/web bundle always evaluates the literal require branch.
 */
const TEST_ASSET_FALLBACK = 1;
const foxTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/fox-talk.m4a');
const horseTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/horse-talk.m4a');
const parrotTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/parrot-talk.m4a');
const flamingoTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/flamingo-talk.m4a');
const storkTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/stork-talk.m4a');
const dogTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/dog-talk.m4a');
const catTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/cat-talk.m4a');
const pandaTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/panda-talk.m4a');
const penguinTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/penguin-talk.m4a');
const sheepTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/sheep-talk.m4a');
const duckTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/duck-talk.m4a');
const rabbitTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/rabbit-talk.wav');
const sealTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/seal-talk.m4a');
const capybaraTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/capybara-talk.m4a');
const koalaTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/koala-talk.m4a');
const bearTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/bear-talk.m4a');
const raccoonTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/raccoon-talk.m4a');
const slothTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/sloth-talk.m4a');

const EMPTY_PROVENANCE: AnimalSoundProvenance = {
  sourceUrl: null,
  author: null,
  license: null,
  modifications: null,
  sha256: null,
  downloadDate: null,
};

function pendingEntry(
  species: SelectablePetTypeId,
  kind: AnimalSoundKind,
  track: AnimalSoundTrack
): AnimalSoundEntry {
  const label = PET_LABELS[species];
  const status: AnimalSoundStatus = track === 'pilot' ? 'pilot-pending' : 'backlog';
  return {
    species,
    kind,
    track,
    status,
    source: null,
    durationMs: null,
    byteSize: null,
    provenance: EMPTY_PROVENANCE,
    warnings: [
      `No exact ${label} recording is bundled for ${kind}; this slot is intentionally silent.`,
      'Do not substitute oscillator notes, TTS, or another species.',
      'Promote to ready only after identity, license, processing, hash, duration, and size are verified.',
    ],
  };
}

type ReadyTalk = {
  source: number | string;
  durationMs: number;
  byteSize: number;
  provenance: AnimalSoundProvenance;
};

function readyTalkEntry(
  species: SelectablePetTypeId,
  ready: ReadyTalk
): AnimalSoundEntry {
  return {
    species,
    kind: 'talk',
    track: 'pilot',
    status: 'ready',
    source: ready.source,
    durationMs: ready.durationMs,
    byteSize: ready.byteSize,
    provenance: ready.provenance,
    warnings: [],
  };
}

function entriesFor(
  species: SelectablePetTypeId,
  ready: ReadyTalk
): { talk: AnimalSoundEntry; play: AnimalSoundEntry } {
  return {
    talk: readyTalkEntry(species, ready),
    // Play remains intentionally silent until a separate friendly cue is
    // licensed. Talk never borrows the same file for another interaction.
    play: pendingEntry(species, 'play', 'pilot'),
  };
}

const DOWNLOAD_DATE = '2026-08-24';
const AAC_MODIFICATIONS = (sourceDetail: string) =>
  `${sourceDetail}; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A.`;
const NORMALIZED_AAC_MODIFICATIONS = (sourceDetail: string) =>
  `${sourceDetail}; high-pass filtered, loudness-normalized, decoded to mono 44.1 kHz PCM, given 40 ms linear fades, and encoded as AAC-LC 64 kbps M4A.`;

/**
 * The only source of truth for animal calls. Every Talk slot is a verified,
 * local recording. Play slots stay silent rather than recycling a Talk cue or
 * inventing a synthetic sound.
 */
export const ANIMAL_SOUND_MANIFEST = {
  fox: entriesFor('fox', {
    source: foxTalkSource,
    durationMs: 1762,
    byteSize: 18536,
    provenance: {
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Potential-Sources-of-High-Frequency-and-Biphonic-Vocalization-in-the-Dhole_(Cuon_alpinus)-pone.0146330.s003.oga',
      author: 'Frey R, Volodin I, Fritsch G, Volodina E',
      license: 'CC-BY',
      modifications: AAC_MODIFICATIONS('Primary PLOS supplementary WAV; used the complete 1.762 s low-frequency red fox call.'),
      sha256: '6f9a414d3de8dfe7768d3583314532828072f874b36f8247e57b7c6d891ccce5',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  horse: entriesFor('horse', {
    source: horseTalkSource,
    durationMs: 904,
    byteSize: 11657,
    provenance: {
      sourceUrl: 'https://freesound.org/people/GoodListener/sounds/322450/',
      author: 'GoodListener',
      license: 'CC-BY',
      modifications: AAC_MODIFICATIONS('Trimmed to the complete 0.904 s soft horse neigh.'),
      sha256: '9354d0e6fa5ed0e2b70b87df748ff3841ac27bcd25bdf3b75fa863dcbf4f9838',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  parrot: entriesFor('parrot', {
    source: parrotTalkSource,
    durationMs: 1600,
    byteSize: 17226,
    provenance: {
      sourceUrl: 'https://freesound.org/people/claretcanelon/sounds/346141/',
      author: 'claretcanelon',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Trimmed from 0.450 s to 2.050 s of the recorded baby-parrot vocalization.'),
      sha256: '987ee3497d3bc2b6efbfa83642108cea3852d3daa8ea36774ce43e2ab471deb4',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  flamingo: entriesFor('flamingo', {
    source: flamingoTalkSource,
    durationMs: 1800,
    byteSize: 18904,
    provenance: {
      sourceUrl: 'https://freesound.org/people/Breviceps/sounds/535778/',
      author: 'Breviceps',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Trimmed from 0.200 s to 2.000 s of the recorded flamingo sounds.'),
      sha256: '662016981295ce5358536d2bffe00f915da55c1ee03dc3ce0672bb33136742d5',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  stork: entriesFor('stork', {
    source: storkTalkSource,
    durationMs: 1800,
    byteSize: 18974,
    provenance: {
      sourceUrl: 'https://freesound.org/people/Breviceps/sounds/705861/',
      author: 'Breviceps',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Trimmed from 0.250 s to 2.050 s of White Stork bill-clapping.'),
      sha256: '9d58dce9be46a166d4cc7dba6fcd2f407c1c8ee34f9ad61bd43a51b589f02811',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  dog: entriesFor('dog', {
    source: dogTalkSource,
    durationMs: 2039,
    byteSize: 21070,
    provenance: {
      sourceUrl: 'https://opengameart.org/content/dog-barking-mono',
      author: 'Brandon Morris (submitted by HaelDB)',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Used the complete 2.039 s mono dog-barking recording; no species substitution.'),
      sha256: '128b1978f1f47f67d2a7d0597678fe474c8ce70118976f7327da226330d298e0',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  cat: entriesFor('cat', {
    source: catTalkSource,
    durationMs: 612,
    byteSize: 5469,
    provenance: {
      sourceUrl: 'https://freesound.org/people/swatkamus/sounds/260179/',
      acquisitionUrl: 'https://cdn.freesound.org/previews/260/260179_4400688-hq.mp3',
      author: 'swatkamus',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Trimmed the complete 0.546 s small-cat meow from the HQ preview after removing MP3 encoder padding; added 0.080 s of trailing silence so the call remains above the short-cue floor.'),
      sha256: 'f4a62aeb03e4112f497c304248daa5321d87dfb9c6b0f538163419e8f73bbbfa',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  panda: entriesFor('panda', {
    source: pandaTalkSource,
    durationMs: 2000,
    byteSize: 20575,
    provenance: {
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Giant_panda_twittering.ogg',
      author: 'Mizunoryu (uploader; page credits “Myself” for the own-work recording)',
      license: 'Public-Domain',
      modifications: AAC_MODIFICATIONS('Trimmed from 0.200 s to 2.200 s of the public-domain giant-panda twittering call.'),
      sha256: '4731cbcbc8637960009bd876ad66587f089700f6a4d4d974ebab18c16219933f',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  penguin: entriesFor('penguin', {
    source: penguinTalkSource,
    durationMs: 464,
    byteSize: 8329,
    provenance: {
      sourceUrl: 'https://opengameart.org/content/penguin-sounds',
      author: 'AntumDeluge (extracted from a recording by Bidone)',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Used the complete 0.464 s penguin_01 clip; OpenGameArt source states background noise was removed.'),
      sha256: '4eb9f128eb4c11b1317414bf944cc673e41a215f65045f5f062e7f114dc2afc1',
      downloadDate: DOWNLOAD_DATE,
    },
  }),
  sheep: entriesFor('sheep', {
    source: sheepTalkSource,
    durationMs: 1820,
    byteSize: 15787,
    provenance: {
      sourceUrl: 'https://freesound.org/people/Chipsplease/sounds/669765/',
      acquisitionUrl: 'https://cdn.freesound.org/previews/669/669765_14629129-hq.mp3',
      author: 'Chipsplease',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Trimmed ~1.80 s of the recorded sheep baa from the HQ preview.'),
      sha256: 'd9f875599df44b957f4c7da221c19a19d2b2202976904df98ca53d9d75837037',
      downloadDate: '2026-08-25',
    },
  }),
  duck: entriesFor('duck', {
    source: duckTalkSource,
    durationMs: 410,
    byteSize: 4250,
    provenance: {
      sourceUrl: 'https://freesound.org/people/Breviceps/sounds/445960/',
      acquisitionUrl: 'https://cdn.freesound.org/previews/445/445960_9159316-hq.mp3',
      author: 'Breviceps',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Used the complete ~0.38 s cartoon duck quack from the HQ preview.'),
      sha256: 'c8464ad52fc956c04b7e1561efdf84f3fbd0dc4f557eb9d9081e22d18627442b',
      downloadDate: '2026-08-25',
    },
  }),
  rabbit: entriesFor('rabbit', {
    source: rabbitTalkSource,
    durationMs: 2000,
    byteSize: 176478,
    provenance: {
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rabbit_oinks_and_squeaks.wav',
      author: 'kessir (Freesound recording; Wikimedia Commons mirror)',
      license: 'CC0',
      modifications: 'Used 20.20–22.20 s of the authentic rabbit oinks and squeaks recording; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz PCM, and given 40 ms linear fades.',
      sha256: '0f132fa07ee0cf958f1545361fe6fc478d6084e6829b7b452d049342305e6a38',
      downloadDate: '2026-08-29',
    },
  }),
  seal: entriesFor('seal', {
    source: sealTalkSource,
    durationMs: 1820,
    byteSize: 16056,
    provenance: {
      sourceUrl: 'https://freesound.org/people/florianreichelt/sounds/450751/',
      acquisitionUrl: 'https://cdn.freesound.org/previews/450/450751_6253486-hq.mp3',
      author: 'florianreichelt',
      license: 'CC0',
      modifications: AAC_MODIFICATIONS('Trimmed ~1.80 s of the recorded seal call from the HQ preview.'),
      sha256: 'b9dab2322e462d8877f5a49f659eed049660578285f130f8e92a388d9c0b7424',
      downloadDate: '2026-08-25',
    },
  }),
  capybara: entriesFor('capybara', {
    source: capybaraTalkSource,
    durationMs: 10657,
    byteSize: 170190,
    provenance: {
      sourceUrl: 'https://www.youtube.com/shorts/IKzE1VXmJ7c',
      acquisitionUrl: 'https://www.youtube.com/shorts/IKzE1VXmJ7c',
      author: 'YouTube Short (IKzE1VXmJ7c)',
      license: 'CC-BY',
      modifications: NORMALIZED_AAC_MODIFICATIONS('Derived from YouTube Short IKzE1VXmJ7c capybara call audio'),
      sha256: 'b99fc4ddfca801ffcada9f6ab644d224184065f3a924c77a28d6556b1670c4a6',
      downloadDate: '2026-09-02',
    },
  }),
  koala: entriesFor('koala', {
    source: koalaTalkSource,
    durationMs: 1800,
    byteSize: 15979,
    provenance: {
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Perception-of-Male-Caller-Identity-in-Koalas-(Phascolarctos-cinereus)-Acoustic-Analysis-and-pone.0020329.s001.ogv',
      acquisitionUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Perception-of-Male-Caller-Identity-in-Koalas-%28Phascolarctos-cinereus%29-Acoustic-Analysis-and-pone.0020329.s001.ogv',
      author: 'Charlton B, Ellis W, McKinnon A, Brumm J, Nilsson K, Fitch W',
      license: 'CC-BY',
      modifications: NORMALIZED_AAC_MODIFICATIONS('Used 0.20–2.00 s of the recorded male koala bellow.'),
      sha256: 'aab34c20b86c038311ea837e53fce65653e4fb45dc2748da3121fd4fcd1d6bb0',
      downloadDate: '2026-08-29',
    },
  }),
  bear: entriesFor('bear', {
    source: bearTalkSource,
    durationMs: 1800,
    byteSize: 16058,
    provenance: {
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Yellowstone_sound_library_-_Grizzly_Bear_Eating_-_001.mp3',
      acquisitionUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Yellowstone_sound_library_-_Grizzly_Bear_Eating_-_001.mp3',
      author: 'National Park Service and MSU Acoustic Atlas / Jennifer Jerrett',
      license: 'Public-Domain',
      modifications: NORMALIZED_AAC_MODIFICATIONS('Used 0.20–2.00 s of the Yellowstone grizzly-bear eating vocalization.'),
      sha256: '8b56e8c0ebdf8a93a560bddb39715c29552ac647cd33c50ed2e8f2d5c4c60dbc',
      downloadDate: '2026-08-29',
    },
  }),
  raccoon: entriesFor('raccoon', {
    source: raccoonTalkSource,
    durationMs: 1800,
    byteSize: 15922,
    provenance: {
      sourceUrl: 'https://freesound.org/people/MoveAwayPodcast/sounds/555365/',
      acquisitionUrl: 'https://cdn.freesound.org/previews/555/555365_11888343-hq.mp3',
      author: 'MoveAwayPodcast',
      license: 'CC-BY',
      modifications: NORMALIZED_AAC_MODIFICATIONS('Used 0.50–2.30 s of the authentic raccoon noises recording.'),
      sha256: '58d7f8aebb88867fd60ad67faa0f0fb2ec311f273f11a00be87e0116d7b1fb35',
      downloadDate: '2026-08-29',
    },
  }),
  sloth: entriesFor('sloth', {
    source: slothTalkSource,
    durationMs: 1299,
    byteSize: 12332,
    provenance: {
      sourceUrl: 'https://freesound.org/people/TheKingOfGeeks360/sounds/792534/',
      acquisitionUrl: 'https://cdn.freesound.org/previews/792/792534_15895934-hq.mp3',
      author: 'TheKingOfGeeks360',
      license: 'CC0',
      modifications: NORMALIZED_AAC_MODIFICATIONS('Used the complete 1.299 s kid-goat bleat as a zoologically grounded soundalike for a two-fingered baby sloth “meep”.'),
      sha256: '3a36aebd1df0dbd37927d4063a04932751c84115040c8cbeab5522508ea11471',
      downloadDate: '2026-09-01',
    },
  }),
} as const satisfies Record<SelectablePetTypeId, { talk: AnimalSoundEntry; play: AnimalSoundEntry }>;

export const ANIMAL_SOUND_PILOT_SPECIES = Object.keys(ANIMAL_SOUND_MANIFEST) as SelectablePetTypeId[];
export const ANIMAL_SOUND_BACKLOG_SPECIES: SelectablePetTypeId[] = [];

export function getAnimalSoundEntry(
  species: string,
  kind: AnimalSoundKind
): AnimalSoundEntry | null {
  const entry = (ANIMAL_SOUND_MANIFEST as Record<string, { talk: AnimalSoundEntry; play: AnimalSoundEntry }>)[species];
  return entry?.[kind] || null;
}

export function animalSoundIsPlayable(entry: AnimalSoundEntry | null): entry is AnimalSoundEntry & {
  source: number | string;
  durationMs: number;
  status: 'ready';
} {
  return Boolean(
    entry &&
      entry.status === 'ready' &&
      (typeof entry.source === 'number' || typeof entry.source === 'string') &&
      entry.durationMs !== null &&
      entry.durationMs > 0
  );
}
