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
  rabbit: 'Rabbit',
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
const rabbitTalkSource: number = typeof require === 'undefined'
  ? TEST_ASSET_FALLBACK
  : require('../../assets/audio/animal-calls/rabbit-talk.wav');

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
  rabbit: entriesFor('rabbit', {
    source: rabbitTalkSource,
    durationMs: 2000,
    byteSize: 176444,
    provenance: {
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rabbit_oinks_and_squeaks.wav',
      author: 'kessir (Freesound recording; Wikimedia Commons mirror)',
      license: 'CC0',
      modifications: 'Trimmed the first 2.000 s of the verified rabbit oink/squeak WAV; decoded to mono 44.1 kHz signed 16-bit PCM; bundled as WAV for Expo SDK 57 cross-platform playback.',
      sha256: 'f1972981c62348f1aef83b63110cdf18d3bfb84fb15132d205e4d61175f95553',
      downloadDate: DOWNLOAD_DATE,
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
