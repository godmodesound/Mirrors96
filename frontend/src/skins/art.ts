// Artwork used by the art skins (01–04). Bundled locally so they work offline.
import { getSkin, activeSkinId } from './index';

export const LAB_ART = {
  emerald: require('../../assets/skins/lab-emerald.jpg'),
  dream: require('../../assets/skins/lab-dream.jpg'),
  portal: require('../../assets/skins/lab-portal.jpg'),
};
/** BODY MAP portal figure, shown on every skin. Node coordinates use this 853×1060 space. */
export const BODY_PORTAL_ART = require('../../assets/skins/body-portal.jpg');
export const BODY_ART_W = 853;
export const BODY_ART_H = 1060;

export const activeLabArt = () => { const a = getSkin(activeSkinId()).labArt; return a ? LAB_ART[a] : null; };
