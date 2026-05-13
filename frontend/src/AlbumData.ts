export interface Track {
  number: number;
  name: string;
  duration: number;
  previewUrl: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  buyUrl: string;
  tracks: Track[];
}

export const ALBUMS: Album[] = [
  {
    id: 'mirrors',
    name: '96 Mirrors',
    artist: 'VINCE SINNOTT',
    coverUrl: 'https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/enhrt4um_96%20Mirros%20Album%20Cover.PNG',
    buyUrl: 'https://www.vincesinnott.com/',
    tracks: [
      { number: 1, name: '96 MIRRORS', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/ln4b6jco_8A%20-%20120%20-%2096%20MIRRORS.mp3' },
      { number: 2, name: 'WENOTDONE', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/qvnwhve9_12A%20-%20120%20-%20WENOTDONE.mp3' },
      { number: 3, name: '13th St', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/r3butkxf_6A%20-%20113%20-%2013th%20St.mp3' },
      { number: 4, name: 'Here 2day Gone 2morrow', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/26hfugzg_7B%20-%20126%20-%20Here%202day%20Gone%202morrow%201.0%20Master.mp3' },
      { number: 5, name: 'Musical Chairs 2026', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/5dx9b17g_Musical%20Chairs%202026.wav' },
      { number: 6, name: 'Poor Man Style', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/11d478ay_Poor%20Man%20Style%201.wav' },
      { number: 7, name: '$hango', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/iw2rtqvs_9B%20-%2096%20-%20%24hango%201.mp3' },
      { number: 8, name: 'Spun The Block', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/4lfpdxp6_Spun%20The%20Block.mp3' },
      { number: 9, name: 'Grateful', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/vqa0bq5r_12A%20-%2090%20-%20Grateful%20mp3' },
      { number: 10, name: 'UNCLE MAJIC', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/6nk2vnna_1A%20-%20123%20-%20UNCLE%20MAJIC.mp3' },
      { number: 11, name: 'RED Magick', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/nlohe1ei_6A%20-%2090%20-%20RED%20Magick.mp3' },
    ],
  },
  {
    id: 'codes',
    name: 'CODES',
    artist: 'VINCE SINNOTT',
    coverUrl: 'https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/lad4p2yz_CODES%20Album%20Cover.jpg',
    buyUrl: 'https://music.apple.com/us/album/codes/1812232122',
    tracks: [
      { number: 1, name: 'Godmode', duration: 184, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4f/8c/32/4f8c32fe-5378-c312-0755-212fe63388fc/mzaf_17829693640304093227.plus.aac.p.m4a' },
      { number: 2, name: 'Codes', duration: 178, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6b/15/78/6b1578ce-5390-a3ce-ca8b-2cd39914002f/mzaf_1048806144312164392.plus.aac.p.m4a' },
      { number: 3, name: '24k', duration: 199, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6f/96/ac/6f96ac68-d4d2-56fa-7f2f-43493c777941/mzaf_8814360879190482150.plus.aac.p.m4a' },
      { number: 4, name: 'Lion Heart', duration: 241, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/99/d2/66/99d266c2-d0f1-7596-349c-ee16ba8c5645/mzaf_17578850710648420093.plus.aac.p.m4a' },
      { number: 5, name: 'Dont Stop', duration: 165, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/bc/58/7b/bc587bf3-c4ff-bc81-ec11-f930547b5cc2/mzaf_11051634775457919732.plus.aac.p.m4a' },
      { number: 6, name: 'My Mind', duration: 540, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/97/65/a6/9765a6ec-e68d-e27f-612d-a708eeecefd5/mzaf_15244401874270995412.plus.aac.p.m4a' },
      { number: 7, name: 'Silence', duration: 602, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d1/9e/a1/d19ea1e4-9b0c-a3b6-6e67-b95f16948399/mzaf_12575889581579936422.plus.aac.p.m4a' },
      { number: 8, name: 'Concrete Jungle', duration: 564, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/82/b0/ab/82b0ab9b-873d-a9b8-e687-3f8e32119ad4/mzaf_17787630541741412165.plus.aac.p.m4a' },
      { number: 9, name: 'Blood Sport', duration: 300, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c5/c8/33/c5c8338c-ba48-908e-a74b-a63e5953548c/mzaf_496486317934970007.plus.aac.p.m4a' },
      { number: 10, name: '96', duration: 224, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ec/92/fe/ec92fe12-ddcf-d507-7a82-db03dc6b789f/mzaf_5425244390310252531.plus.aac.p.m4a' },
      { number: 11, name: 'Cooked', duration: 196, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e3/78/06/e37806a9-2cb2-e9c8-4844-6721d57a994c/mzaf_14274973361366556695.plus.aac.p.m4a' },
      { number: 12, name: 'Third Eye', duration: 196, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7c/18/19/7c1819a2-4824-5855-5f41-a25c762cd9bd/mzaf_8342131892846004082.plus.aac.p.m4a' },
      { number: 13, name: 'Source', duration: 240, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/8d/38/4b/8d384b46-e76f-c66f-4e15-6515e723f39e/mzaf_6803796609291461672.plus.aac.p.m4a' },
    ],
  },
  {
    id: 'in-memory-of',
    name: 'In Memory Of',
    artist: 'VINCE SINNOTT',
    coverUrl: 'https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/hlbaomri_%22In%20Memory%20Of%22%20Cover%20Art.jpeg',
    buyUrl: 'https://music.apple.com/us/album/in-memory-of/1340448168',
    tracks: [
      { number: 1, name: 'Suite 907', duration: 224, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview118/v4/1d/21/fa/1d21fa4a-761a-221f-1f2a-652aab09fd1d/mzaf_5266959012416407129.plus.aac.p.m4a' },
      { number: 2, name: 'The Shelborne', duration: 192, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/e9/88/31/e98831f0-46de-fcdf-ed9f-0c305cbf70a0/mzaf_5003615599450184381.plus.aac.p.m4a' },
      { number: 3, name: 'Our City', duration: 160, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/ff/7d/76/ff7d7688-cb2e-8944-3ed7-106af0fdeb81/mzaf_4416078873485901344.plus.aac.p.m4a' },
      { number: 4, name: 'Yolanda', duration: 16, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/6c/6c/e4/6c6ce4c2-558f-6e20-e12e-f8b91846c9b1/mzaf_1772394950704164433.plus.aac.p.m4a' },
      { number: 5, name: '528 Hz (feat. Layla Colon)', duration: 238, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview118/v4/d1/35/19/d1351996-b61f-76bd-1e85-3eb17162ecb3/mzaf_1820789188442457085.plus.aac.p.m4a' },
      { number: 6, name: 'Deja Vu', duration: 192, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/77/4c/6a/774c6a97-e198-e0bc-35a9-8db40de47b39/mzaf_3117401671601492602.plus.aac.p.m4a' },
      { number: 7, name: 'This Feeling (feat. Jailani Colon)', duration: 192, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview62/v4/dd/a7/fa/dda7fa08-bdf9-093e-2c8a-757eee1acf0e/mzaf_138834032178363989.plus.aac.p.m4a' },
      { number: 8, name: 'Trumpets', duration: 202, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview62/v4/45/3d/b6/453db62c-0f95-0325-2ef0-d0aecd4ef736/mzaf_243804411782354297.plus.aac.p.m4a' },
      { number: 9, name: 'Le Trip', duration: 220, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/32/da/c4/32dac450-434d-5fbb-5b00-28cb726983c0/mzaf_2438330561235215379.plus.aac.p.m4a' },
      { number: 10, name: '6th Dimension', duration: 259, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview118/v4/96/03/a4/9603a45a-61e6-3487-df27-43f7ab64ae7e/mzaf_8168088943282317858.plus.aac.p.m4a' },
      { number: 11, name: 'Sinnott', duration: 56, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview118/v4/59/46/85/59468515-6675-8c12-7c4a-e454a88d8417/mzaf_2569676284431768460.plus.aac.p.m4a' },
      { number: 12, name: 'Presence', duration: 220, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview62/v4/65/30/7c/65307c36-966c-22c3-5f19-dcbe63649b0f/mzaf_8062683386120253954.plus.aac.p.m4a' },
      { number: 13, name: '13th Pick', duration: 216, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/51/db/d2/51dbd2fd-653e-b87d-e65c-942bda9fcbdc/mzaf_9042982576456168947.plus.aac.p.m4a' },
      { number: 14, name: 'The Force', duration: 271, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/f2/0d/22/f20d220e-7b27-9218-2f5a-4c8b38b430c0/mzaf_1582248433680190527.plus.aac.p.m4a' },
      { number: 15, name: 'King Leo', duration: 207, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/33/c0/b9/33c0b9bf-33ef-0208-9f73-58e620156eab/mzaf_2473767291361877612.plus.aac.p.m4a' },
      { number: 16, name: 'Le Basement', duration: 255, previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview118/v4/f7/68/66/f768662e-60e5-05e1-e994-724bc3427d5a/mzaf_1120318295400385816.plus.aac.p.m4a' },
    ],
  },
  {
    id: 'presence',
    name: 'Presence',
    artist: 'VINCE SINNOTT',
    coverUrl: 'https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/7lcyfgfs_B02A6EBE-FF31-4466-A91C-5FF92392AC80.jpg',
    buyUrl: 'https://www.vincesinnott.com/',
    tracks: [
      { number: 1, name: 'Etheric Template', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/xop38yvf_Etheric%20Template.m4a' },
      { number: 2, name: 'Le Vision', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/orjtmqv6_Le%20Vision.m4a' },
      { number: 3, name: "Leo's House", duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/s5a4jpzc_Leo%27s%20House.m4a' },
      { number: 4, name: '1990 6', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/mp4z0rit_1990%206.mp3' },
      { number: 5, name: 'Still N.Y.C', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/ufd8cbnr_Still%20N.Y.C.mp3' },
    ],
  },
  {
    id: '13',
    name: '13',
    artist: 'VINCE SINNOTT',
    coverUrl: 'https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/zqe6xtbw_photo%20%286%29.JPG',
    buyUrl: 'https://www.vincesinnott.com/',
    tracks: [
      { number: 1, name: '13Elieve', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/k6jbxze1_13Elieve.m4a' },
      { number: 2, name: "Leo's House", duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/butg9mbt_Leo%27s%20House.m4a' },
      { number: 3, name: 'Lost', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/yh0fyk80_Lost.m4a' },
      { number: 4, name: 'The 2nd Coming (feat. Boogie Dash)', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/zb3xco63_The%202nd%20Coming%20%28feat.%20Boogie%20Dash%29.m4a' },
      { number: 5, name: 'The Trip', duration: 0, previewUrl: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/j2k48axg_The%20Trip.m4a' },
    ],
  },
  {
    id: 'lucid-dreams',
    name: 'Lucid Dreams',
    artist: 'VINCE SINNOTT',
    coverUrl: 'https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/b23nnhud_B0A66545-E410-4F79-B221-A82B469DBF88.jpg',
    buyUrl: 'https://www.vincesinnott.com/',
    tracks: [],
  },
];

// Only albums with tracks
export const PLAYABLE_ALBUMS = ALBUMS.filter(a => a.tracks.length > 0);
