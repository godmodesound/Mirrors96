"""Public, artist-approved 96 MIRRORS catalogue release."""

MIRRORS_COVER = "https://customer-assets-rejwkqb3.emergentagent.net/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/a531g1s7_Codex%20Image%20Sep%206%2C%202026%2C%2002_21_12%20AM.png"
ARTIFACTS = "https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/"
NEW_ARTIFACTS = "https://customer-assets-rejwkqb3.emergentagent.net/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/"

PUBLIC_MIRRORS_TRACKS = {
    "mirror-world": {"title": "MIRROR WORLD", "duration": 240, "original_url": NEW_ARTIFACTS + "83911930a00fbaaa_10A%20-%20120%20-%20Mirror%20Worlds.wav"},
    "i-in-mirror": {"title": "I IN MIRROR", "duration": 171, "original_url": NEW_ARTIFACTS + "843628a7fb00a57a_8B%20-%2090%20-%20I%20in%20Mirror.wav"},
    "glowing": {"title": "GLOWING", "duration": 200, "original_url": NEW_ARTIFACTS + "fddf4c7c63dc614d_8A%20-%2096%20-%20GLOWING.mp3"},
}

_ORIGINAL_TRACKS = [
    ("96 MIRRORS", "ln4b6jco_8A%20-%20120%20-%2096%20MIRRORS.mp3"),
    ("WENOTDONE", "qvnwhve9_12A%20-%20120%20-%20WENOTDONE.mp3"),
    ("13th St", "r3butkxf_6A%20-%20113%20-%2013th%20St.mp3"),
    ("Here 2day Gone 2morrow", "26hfugzg_7B%20-%20126%20-%20Here%202day%20Gone%202morrow%201.0%20Master.mp3"),
    ("Musical Chairs 2026", "5dx9b17g_Musical%20Chairs%202026.wav"),
    ("Poor Man Style", "11d478ay_Poor%20Man%20Style%201.wav"),
    ("$hango", "iw2rtqvs_9B%20-%2096%20-%20%24hango%201.mp3"),
    ("Spun The Block", "4lfpdxp6_Spun%20The%20Block.mp3"),
    ("Grateful", "vqa0bq5r_12A%20-%2090%20-%20Grateful%20mp3"),
    ("UNCLE MAJIC", "6nk2vnna_1A%20-%20123%20-%20UNCLE%20MAJIC.mp3"),
    ("RED Magick", "nlohe1ei_6A%20-%2090%20-%20RED%20Magick.mp3"),
]

MIRRORS_RELEASE = {
    "name": "96 MIRRORS",
    "cover_url": MIRRORS_COVER,
    "description": "96 MIRRORS — 14 full tracks by VINCE SINNOTT. Includes MIRROR WORLD, I IN MIRROR and GLOWING.",
    "tracklist": [name for name, _ in _ORIGINAL_TRACKS] + [t["title"] for t in PUBLIC_MIRRORS_TRACKS.values()],
    "preview_urls": [ARTIFACTS + path for _, path in _ORIGINAL_TRACKS] + [f"/api/music/mirrors/{slug}.mp3" for slug in PUBLIC_MIRRORS_TRACKS],
    "catalog_revision": "mirrors-14-white-chrome-v2",
}