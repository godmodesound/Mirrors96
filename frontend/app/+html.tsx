// @ts-nocheck
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        
        {/* SEO — cleaned meta */}
        <title>MIRRORS by Vince Sinnott — Functional Sound on 432Hz | GODMODE SOUND</title>
        <meta name="description" content="96 calibrated sessions for focus, calm, and deep presence. Built on a 432Hz foundation by electronic music artist Vince Sinnott. Artist-curated generative audio, not an algorithm." />
        <meta name="keywords" content="MIRRORS, Vince Sinnott, GODMODE SOUND, 432Hz, focus, calm, deep work, ambient, generative audio, artist-curated, functional sound, electronic music, frequency exploration" />
        
        {/* Open Graph */}
        <meta property="og:title" content="MIRRORS — Functional Sound by Vince Sinnott" />
        <meta property="og:description" content="96 calibrated sessions for focus, calm, and deep presence. Built on a 432Hz foundation by an electronic music artist." />
        <meta property="og:type" content="music.album" />
        <meta property="og:site_name" content="GODMODE SOUND" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MIRRORS — Functional Sound by Vince Sinnott" />
        <meta name="twitter:description" content="96 calibrated sessions for focus, calm, and deep presence on 432Hz." />
        
        {/* JSON-LD MusicGroup Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MusicGroup",
              "name": "Vince Sinnott",
              "alternateName": "Codes",
              "description": "Electronic music composer releasing on GODMODE SOUND. Creator of MIRRORS, an applied-listening project with 96 calibrated sessions on 432Hz.",
              "genre": ["Electronic", "Ambient", "Generative Audio"],
              "url": "https://godmodesound.com",
              "sameAs": [
                "https://music.apple.com/us/artist/codes/1491858588",
                "https://soundcloud.com/codes-godmode"
              ],
              "album": [
                {
                  "@type": "MusicAlbum",
                  "name": "Codes",
                  "datePublished": "2025",
                  "url": "https://music.apple.com/us/artist/codes/1491858588"
                },
                {
                  "@type": "MusicAlbum",
                  "name": "In Memory Of",
                  "datePublished": "2018"
                },
                {
                  "@type": "MusicAlbum",
                  "name": "96 Mirrors",
                  "description": "96 calibrated frequency sessions for focus, calm, and deep presence on 432Hz"
                }
              ],
              "memberOf": {
                "@type": "Organization",
                "name": "GODMODE SOUND",
                "url": "https://godmodesound.com"
              }
            })
          }}
        />
        
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body style={{ backgroundColor: '#000000', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #000000;
}
`;
