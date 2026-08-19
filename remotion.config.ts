import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(4);

/**
 * Force limited-range 4:2:0.
 *
 * Left to itself, the JPEG frame pipeline hands x264 full-range input and the file comes
 * out as `yuvj420p`. That format is deprecated, and players that honour the full-range
 * flag inconsistently will shift the levels — on a video whose whole palette is warm
 * off-white paper and warm charcoal, that shows up immediately as washed-out or crushed
 * output. `yuv420p` + BT.709 is what YouTube expects.
 */
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
