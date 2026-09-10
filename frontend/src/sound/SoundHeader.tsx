import React from 'react';
import { Text, View } from 'react-native';
import { ALBUMS } from '../AlbumData';
import { SoundLabIcon } from './SoundLabIcon';
import { ss } from './soundStyles';

export function SoundHeader({ prefix }: { prefix: string }) {
  return <View style={ss.header}>
    <View style={ss.eyebrowRow}><View style={ss.dot} /><Text style={ss.eyebrow}>GODMODE SOUND / INDEX 03</Text></View>
    <View style={ss.headerRow}><View><Text testID={`${prefix}-sound-title`} style={ss.title}>SOUND</Text><Text style={ss.subtitle}>LAB</Text></View>
      <SoundLabIcon testID={`${prefix}-sound-lab-icon`} />
    </View><Text testID={`${prefix}-sound-totals`} style={ss.headerMeta}>{ALBUMS.length} albums / {ALBUMS.reduce((sum, album) => sum + album.tracks.length, 0)} recordings</Text>
  </View>;
}