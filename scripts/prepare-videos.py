"""Cria prévias ilustrativas em MP4 com aproximação a partir das fotos do cardápio."""
from pathlib import Path
import subprocess
import imageio_ffmpeg

media = Path(__file__).resolve().parent.parent / 'public' / 'media'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for photo in media.glob('*.webp'):
    if photo.stem in ['hero', 'logo']:
        continue
    output = photo.with_suffix('.mp4')
    if output.exists() and output.stat().st_mtime >= photo.stat().st_mtime:
        continue
    result = subprocess.run([
        ffmpeg, '-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', str(photo),
        '-vf', "scale=1200:930,zoompan=z='1.02+0.0012*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=75:s=600x464:fps=25",
        '-t', '3', '-c:v', 'libx264', '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-an', '-y', str(output)
    ], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    print(output.name)
