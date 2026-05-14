import { useEffect, useRef, useState } from 'react';

const PlayIcon = () => (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="currentColor">
        <polygon points="0,0 9,5.5 0,11" />
    </svg>
);

const PauseIcon = () => (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="currentColor">
        <rect x="0" y="0" width="3" height="11" />
        <rect x="6" y="0" width="3" height="11" />
    </svg>
);

const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

type Props = {
    src: string;
    title: string;
    index: number;
    compact?: boolean;
};

const AudioPlayer = ({ src, title, index, compact = false }: Props) => {
    const audioRef   = useRef<HTMLAudioElement>(null);
    const trackRef   = useRef<HTMLDivElement>(null);
    const [playing,  setPlaying]  = useState(false);
    const [current,  setCurrent]  = useState(0);
    const [duration, setDuration] = useState(0);
    const [seeking,  setSeeking]  = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay     = () => setPlaying(true);
        const onPause    = () => setPlaying(false);
        const onEnded    = () => { setPlaying(false); setCurrent(0); };
        const onTime     = () => { if (!seeking) setCurrent(audio.currentTime); };
        const onMeta     = () => setDuration(audio.duration);

        // Pause all other audio elements when this one plays
        const onPlayGlobal = () => {
            document.querySelectorAll<HTMLAudioElement>('audio').forEach(a => {
                if (a !== audio) a.pause();
            });
        };

        audio.addEventListener('play',             onPlay);
        audio.addEventListener('play',             onPlayGlobal);
        audio.addEventListener('pause',            onPause);
        audio.addEventListener('ended',            onEnded);
        audio.addEventListener('timeupdate',       onTime);
        audio.addEventListener('loadedmetadata',   onMeta);
        audio.addEventListener('durationchange',   onMeta);

        return () => {
            audio.removeEventListener('play',           onPlay);
            audio.removeEventListener('play',           onPlayGlobal);
            audio.removeEventListener('pause',          onPause);
            audio.removeEventListener('ended',          onEnded);
            audio.removeEventListener('timeupdate',     onTime);
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeEventListener('durationchange', onMeta);
        };
    }, [seeking]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        playing ? audio.pause() : audio.play();
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        const bar   = trackRef.current;
        if (!audio || !bar || !duration) return;
        const ratio = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
        audio.currentTime = ratio * duration;
        setCurrent(ratio * duration);
    };

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setSeeking(true);
        seekTo(e);
        const onMove = (ev: MouseEvent) => {
            const audio = audioRef.current;
            const bar   = trackRef.current;
            if (!audio || !bar || !duration) return;
            const ratio = Math.max(0, Math.min(1, (ev.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
            audio.currentTime = ratio * duration;
            setCurrent(ratio * duration);
        };
        const onUp = () => {
            setSeeking(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',  onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    };

    const progress = duration ? current / duration : 0;

    const controls = (
        <>
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play / Pause */}
            <button
                onClick={togglePlay}
                className="shrink-0 w-6 h-6 border border-nier-150 flex items-center justify-center
                           text-nier-text-dark/60 hover:bg-nier-dark hover:text-nier-text-light
                           hover:border-nier-dark cursor-pointer transition-colors duration-100"
            >
                {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Scrubber */}
            <div
                ref={trackRef}
                className="flex-1 h-4 flex items-center cursor-pointer group/scrub"
                onMouseDown={onMouseDown}
            >
                <div className="relative w-full h-0.5 bg-nier-150">
                    <div
                        className="absolute inset-y-0 left-0 bg-nier-text-dark/60"
                        style={{ width: `${progress * 100}%` }}
                    />
                    <div
                        className="absolute top-1/2 w-2 h-2 bg-nier-dark border border-nier-dark
                                   opacity-0 group-hover/scrub:opacity-100 transition-opacity duration-100
                                   pointer-events-none"
                        style={{ left: `${progress * 100}%`, transform: 'translate(-50%, -50%)' }}
                    />
                </div>
            </div>

            {/* Time */}
            <span className="text-[10px] font-mono text-nier-text-dark/40 shrink-0 tabular-nums w-20 text-right">
                {fmt(current)} / {fmt(duration)}
            </span>
        </>
    );

    if (compact) {
        return (
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {controls}
            </div>
        );
    }

    return (
        <li className="flex items-center gap-3 px-1 py-1.5 group/player hover:bg-nier-150/20 transition-colors">
            {/* Index */}
            <span className="text-[10px] text-nier-text-dark/35 font-mono shrink-0 tabular-nums w-6 text-right">
                {String(index + 1).padStart(2, '0')}
            </span>

            {/* Title */}
            <span className="text-[11px] uppercase tracking-widest text-nier-text-dark/70 w-36 truncate shrink-0">
                {title}
            </span>

            {controls}
        </li>
    );
};

export default AudioPlayer;
