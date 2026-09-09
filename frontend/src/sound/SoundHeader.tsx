import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ALBUMS } from '../AlbumData';
import { MirrorDefs } from '../MirrorFinish';
import { SK } from '../skins';
import { ss } from './soundStyles';

export function SoundHeader({ prefix }: { prefix: string }) {
  const id = `sound-record-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View style={ss.header}>
    <View style={ss.eyebrowRow}><View style={ss.dot} /><Text style={ss.eyebrow}>GODMODE SOUND / INDEX 03</Text></View>
    <View style={ss.headerRow}><View><Text testID={`${prefix}-sound-title`} style={ss.title}>SOUND</Text><Text style={ss.subtitle}>LAB</Text></View>
      <Svg pointerEvents="none" width={70} height={70} viewBox="0 0 70 70"><MirrorDefs id={id} />{[30, 24, 17].map(r => <Circle key={r} cx={35} cy={35} r={r} stroke={`url(#${id}-chrome)`} strokeWidth={1.5} fill="none" />)}<Circle cx={35} cy={35} r={8} fill={`url(#${id}-panel)`} stroke={SK('#ff0a0a')} strokeWidth={1} /><Circle cx={35} cy={35} r={2} fill={SK('#ff0a0a')} /><Path d="M 53 10 L 60 7 L 63 13" stroke={SK('#ff0a0a')} fill="none" /></Svg>
    </View><Text testID={`${prefix}-sound-totals`} style={ss.headerMeta}>{ALBUMS.length} albums / {ALBUMS.reduce((sum, album) => sum + album.tracks.length, 0)} recordings</Text>
  </View>;
}