# Buddi animal-call provenance

These selectable species have local Talk cues. The existing cues are AAC-LC
64 kbps M4A, mono, 44.1 kHz, with 40 ms linear fades. Checksums below are
SHA-256 values of the exact bundled files, not of the source downloads.
Playback is explicit Talk only; the separate Play slots remain intentionally
silent until friendly cues can be licensed and reviewed independently.

Rabbit, capybara, koala, bear, and raccoon use verified same-species recordings
for their Talk interactions. Sloth uses a clearly disclosed kid-goat soundalike:
the Sloth Conservation Foundation describes two-fingered baby sloths as sounding
like baby goats when they “meep.”

**Hamster:** no Talk audio file is bundled. Hamster is a legacy companion id only
(not offered to new patients). `animalSounds.ts` has no hamster entry — Talk is
silent if an old profile still has that species. Do not invent a ledger row for a
missing file.

| Species | Bundled file (duration; bytes) | Verified source page (and acquisition file) | Author / uploader | License | Modifications | SHA-256 | Retrieved |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fox | `fox-talk.m4a` (1.762 s; 18,536) | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Potential-Sources-of-High-Frequency-and-Biphonic-Vocalization-in-the-Dhole_(Cuon_alpinus)-pone.0146330.s003.oga); [PLOS supplementary WAV](https://journals.plos.org/plosone/article/file?type=supplementary&id=info:doi/10.1371/journal.pone.0146330.s003) | Frey R, Volodin I, Fritsch G, Volodina E | CC-BY 4.0 | Primary PLOS supplementary WAV; complete 1.762 s low-frequency red-fox call; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `6f9a414d3de8dfe7768d3583314532828072f874b36f8247e57b7c6d891ccce5` | 2026-08-24 |
| Horse | `horse-talk.m4a` (0.904 s; 11,657) | [Freesound page](https://freesound.org/people/GoodListener/sounds/322450/); [HQ MP3 preview](https://cdn.freesound.org/previews/322/322450_5033007-hq.mp3) | GoodListener | CC-BY 4.0 | Complete 0.904 s soft horse neigh; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `9354d0e6fa5ed0e2b70b87df748ff3841ac27bcd25bdf3b75fa863dcbf4f9838` | 2026-08-24 |
| Parrot | `parrot-talk.m4a` (1.600 s; 17,226) | [Freesound page](https://freesound.org/people/claretcanelon/sounds/346141/); [HQ MP3 preview](https://cdn.freesound.org/previews/346/346141_1096807-hq.mp3) | claretcanelon | CC0 | Trimmed 0.450–2.050 s of the recorded baby-parrot vocalization; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `987ee3497d3bc2b6efbfa83642108cea3852d3daa8ea36774ce43e2ab471deb4` | 2026-08-24 |
| Flamingo | `flamingo-talk.m4a` (1.800 s; 18,904) | [Freesound page](https://freesound.org/people/Breviceps/sounds/535778/); [HQ MP3 preview](https://cdn.freesound.org/previews/535/535778_9159316-hq.mp3) | Breviceps | CC0 | Trimmed 0.200–2.000 s of the recorded flamingo sounds; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `662016981295ce5358536d2bffe00f915da55c1ee03dc3ce0672bb33136742d5` | 2026-08-24 |
| Stork | `stork-talk.m4a` (1.800 s; 18,974) | [Freesound page](https://freesound.org/people/Breviceps/sounds/705861/); [HQ MP3 preview](https://cdn.freesound.org/previews/705/705861_9159316-hq.mp3) | Breviceps | CC0 | Trimmed 0.250–2.050 s of White Stork (*Ciconia ciconia*) bill-clapping; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `9d58dce9be46a166d4cc7dba6fcd2f407c1c8ee34f9ad61bd43a51b589f02811` | 2026-08-24 |
| Dog | `dog-talk.m4a` (2.039 s; 21,070) | [OpenGameArt source page](https://opengameart.org/content/dog-barking-mono); [WAV download](https://opengameart.org/sites/default/files/dog_barking_mono.wav) | Brandon Morris (submitted by HaelDB) | CC0 | Complete 2.039 s mono dog-barking recording; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `128b1978f1f47f67d2a7d0597678fe474c8ce70118976f7327da226330d298e0` | 2026-08-24 |
| Cat | `cat-talk.m4a` (0.612 s; 5,469) | [Freesound source page](https://freesound.org/people/swatkamus/sounds/260179/); [HQ MP3 preview used for acquisition](https://cdn.freesound.org/previews/260/260179_4400688-hq.mp3) | swatkamus | CC0 | Trimmed the complete 0.546 s small-cat meow after removing MP3 encoder padding; added 0.080 s trailing silence; downmixed to mono 44.1 kHz; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `f4a62aeb03e4112f497c304248daa5321d87dfb9c6b0f538163419e8f73bbbfa` | 2026-08-24 |
| Panda | `panda-talk.m4a` (2.000 s; 20,575) | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Giant_panda_twittering.ogg); [OGG download](https://upload.wikimedia.org/wikipedia/commons/b/b8/Giant_panda_twittering.ogg) | Mizunoryu (uploader; page credits “Myself” for the own-work recording) | Public Domain | Trimmed 0.200–2.200 s of the public-domain giant-panda twittering call; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `4731cbcbc8637960009bd876ad66587f089700f6a4d4d974ebab18c16219933f` | 2026-08-24 |
| Penguin | `penguin-talk.m4a` (0.464 s; 8,329) | [OpenGameArt source page](https://opengameart.org/content/penguin-sounds); [source ZIP](https://opengameart.org/sites/default/files/penguin.zip) | AntumDeluge (extracted from a recording by Bidone) | CC0 | Complete 0.464 s `penguin_01` clip; source page states background noise was removed; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `4eb9f128eb4c11b1317414bf944cc673e41a215f65045f5f062e7f114dc2afc1` | 2026-08-24 |
| Sheep | `sheep-talk.m4a` (1.820 s; 15,787) | [Freesound page](https://freesound.org/people/Chipsplease/sounds/669765/); [HQ MP3 preview](https://cdn.freesound.org/previews/669/669765_14629129-hq.mp3) | Chipsplease | CC0 | Trimmed ~1.80 s of the recorded sheep baa; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `d9f875599df44b957f4c7da221c19a19d2b2202976904df98ca53d9d75837037` | 2026-08-25 |
| Duck | `duck-talk.m4a` (0.410 s; 4,250) | [Freesound page](https://freesound.org/people/Breviceps/sounds/445960/); [HQ MP3 preview](https://cdn.freesound.org/previews/445/445960_9159316-hq.mp3) | Breviceps | CC0 | Complete ~0.38 s cartoon duck quack; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `c8464ad52fc956c04b7e1561efdf84f3fbd0dc4f557eb9d9081e22d18627442b` | 2026-08-25 |
| Rabbit | `rabbit-talk.wav` (2.000 s; 176,478) | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Rabbit_oinks_and_squeaks.wav) | kessir (Freesound recording; Wikimedia Commons mirror) | CC0 | Used 20.20–22.20 s of the authentic rabbit oinks and squeaks; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz PCM, and faded. | `0f132fa07ee0cf958f1545361fe6fc478d6084e6829b7b452d049342305e6a38` | 2026-08-29 |
| Seal | `seal-talk.m4a` (1.820 s; 16,056) | [Freesound page](https://freesound.org/people/florianreichelt/sounds/450751/); [HQ MP3 preview](https://cdn.freesound.org/previews/450/450751_6253486-hq.mp3) | florianreichelt | CC0 | Trimmed ~1.80 s of the recorded seal call; decoded to mono 44.1 kHz PCM; 40 ms linear fades; encoded as AAC-LC 64 kbps M4A. | `b9dab2322e462d8877f5a49f659eed049660578285f130f8e92a388d9c0b7424` | 2026-08-25 |
| Capybara | `capybara-talk.m4a` (1.800 s; 15,786) | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Baby_Capybara_Twins.webm); [source video](https://upload.wikimedia.org/wikipedia/commons/b/b1/Baby_Capybara_Twins.webm) | Daniel Baumgartner | CC-BY 3.0 | Used 88.40–90.20 s, where the five-day-old capybaras give the clearest tonal chirps; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz, faded, and encoded as AAC-LC 64 kbps M4A. | `c02480ab9cd7e9395f205c453d69df70e364e30071baf5050164f34805d84cd2` | 2026-08-29 |
| Koala | `koala-talk.m4a` (1.800 s; 15,979) | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Perception-of-Male-Caller-Identity-in-Koalas-(Phascolarctos-cinereus)-Acoustic-Analysis-and-pone.0020329.s001.ogv); [source video](https://upload.wikimedia.org/wikipedia/commons/b/be/Perception-of-Male-Caller-Identity-in-Koalas-%28Phascolarctos-cinereus%29-Acoustic-Analysis-and-pone.0020329.s001.ogv) | Charlton B, Ellis W, McKinnon A, Brumm J, Nilsson K, Fitch W | CC-BY 2.5 | Used 0.20–2.00 s of the recorded male-koala bellow; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz, faded, and encoded as AAC-LC 64 kbps M4A. | `aab34c20b86c038311ea837e53fce65653e4fb45dc2748da3121fd4fcd1d6bb0` | 2026-08-29 |
| Bear | `bear-talk.m4a` (1.800 s; 16,058) | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Yellowstone_sound_library_-_Grizzly_Bear_Eating_-_001.mp3); [source MP3](https://upload.wikimedia.org/wikipedia/commons/0/08/Yellowstone_sound_library_-_Grizzly_Bear_Eating_-_001.mp3) | National Park Service and MSU Acoustic Atlas / Jennifer Jerrett | Public Domain | Used 0.20–2.00 s of the Yellowstone grizzly-bear eating vocalization; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz, faded, and encoded as AAC-LC 64 kbps M4A. | `8b56e8c0ebdf8a93a560bddb39715c29552ac647cd33c50ed2e8f2d5c4c60dbc` | 2026-08-29 |
| Raccoon | `raccoon-talk.m4a` (1.800 s; 15,922) | [Freesound page](https://freesound.org/people/MoveAwayPodcast/sounds/555365/); [HQ MP3 preview](https://cdn.freesound.org/previews/555/555365_11888343-hq.mp3) | MoveAwayPodcast | CC-BY 4.0 | Used 0.50–2.30 s of the authentic raccoon-noises recording; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz, faded, and encoded as AAC-LC 64 kbps M4A. | `58d7f8aebb88867fd60ad67faa0f0fb2ec311f273f11a00be87e0116d7b1fb35` | 2026-08-29 |
| Sloth | `sloth-talk.m4a` (1.299 s; 12,332) | [Freesound source page](https://freesound.org/people/TheKingOfGeeks360/sounds/792534/); [HQ MP3 preview](https://cdn.freesound.org/previews/792/792534_15895934-hq.mp3); [baby-sloth vocalization reference](https://www.slothconservation.org/blog/baby-sloths-everything-you-always-wanted-to-know) | TheKingOfGeeks360 | CC0 | Complete 1.299 s kid-goat bleat used as a zoologically grounded soundalike for a two-fingered baby sloth “meep”; high-pass filtered, loudness-normalized, downmixed to mono 44.1 kHz, given 40 ms linear fades, and encoded as AAC-LC 64 kbps M4A. | `3a36aebd1df0dbd37927d4063a04932751c84115040c8cbeab5522508ea11471` | 2026-09-01 |

## Review notes

- The former fox candidate from Freesound was labeled as a mating call and was
  rejected. It is not bundled. The bundled fox cue is the explicitly
  identified red-fox low-frequency call from the CC-BY PLOS supplementary
  recording.
- No NC, ND, alarm, aggression, or ambiguous-source recording is bundled. The
  sloth cue is the sole cross-species soundalike and is disclosed above; it was
  selected because a conservation source describes the target two-fingered
  baby-sloth call as goat-like. Every Talk entry has an exact source page,
  author/uploader, allowed license, processing note, final-file hash, measured
  duration, byte size, and retrieval date in `src/audio/animalSounds.ts` and
  this ledger.
- Hamster has **no** talk file on disk and no ready entry in `animalSounds.ts`.
- Quiet Time ambient bed lives outside this folder — see
  `../ATTRIBUTION-AMBIENT.md` (Mixkit SFX).
- Expo's SDK 57 local-audio contract is documented by [Expo Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
  and [Expo Asset](https://docs.expo.dev/versions/v57.0.0/sdk/asset/). The
  manifest uses literal static `require()` calls so Metro can bundle the files;
  it never falls back to a remote URL or synthesized oscillator.
