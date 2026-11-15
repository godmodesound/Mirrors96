// Artwork used by the art skins (01–04). Bundled locally so they work offline.
import { getSkin, activeSkinId } from './index';

export const LAB_ART = {
  emerald: require('../../assets/skins/lab-emerald.jpg'),
  dream: require('../../assets/skins/lab-dream.jpg'),
  portal: require('../../assets/skins/lab-portal.jpg'),
};
export const BODY_ART = {
  female: require('../../assets/skins/body-female.jpg'),
  male: require('../../assets/skins/body-male.jpg'),
};
/** Body art crop is 853×1050 of the source; figure coordinates below use that space. */
export const BODY_ART_RATIO = 1050 / 853;

export const activeLabArt = () => { const a = getSkin(activeSkinId()).labArt; return a ? LAB_ART[a] : null; };
export const activeFigure = () => getSkin(activeSkinId()).figure || null;
