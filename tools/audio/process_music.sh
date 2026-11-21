#!/usr/bin/env bash
# Dev-time: raw generated music (assets/audio/music/_dl/<id>.mp3) -> loudness-matched (-23 LUFS) seamless loops (assets/audio/music/<id>.mp3).
# The last 3 s are cross-faded into the first 3 s so the browser's buffer loop has no seam. Usage: process_music.sh theme office ...
set -e; cd "$(dirname "$0")/../../assets/audio/music"
for id in "$@"; do
  L=$(ffprobe -v error -show_entries format=duration -of csv=p=0 _dl/$id.mp3); X=3
  ffmpeg -v error -y -i _dl/$id.mp3 -filter_complex "[0]atrim=$X:$(python3 -c "print($L-$X)"),asetpts=PTS-STARTPTS[body];[0]atrim=$(python3 -c "print($L-$X)"):$L,asetpts=PTS-STARTPTS[tail];[0]atrim=0:$X,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=$X[x];[body][x]concat=n=2:v=0:a=1,loudnorm=I=-23:TP=-2:LRA=11" -ar 44100 -c:a libmp3lame -b:a 112k $id.mp3
  echo "$id $(ffprobe -v error -show_entries format=duration -of csv=p=0 $id.mp3)s $(du -h $id.mp3 | cut -f1)"
done
