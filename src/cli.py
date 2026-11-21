"""Command-line entry point sharing the desktop analysis pipeline."""
import argparse
from .analysis import AnalysisConfig, analyze_video


def main():
    parser = argparse.ArgumentParser(description='SprintBiomechPro: ángulos 2D y exportación de sesión')
    parser.add_argument('video')
    parser.add_argument('--output', default='analysis_results')
    parser.add_argument('--athlete', default='')
    parser.add_argument('--mass', type=float)
    parser.add_argument('--height', type=float)
    parser.add_argument('--start', type=float, default=0)
    parser.add_argument('--end', type=float)
    parser.add_argument('--capture-fps', type=float)
    parser.add_argument('--distance', type=float)
    args = parser.parse_args()
    try:
        config = AnalysisConfig(athlete=args.athlete, mass_kg=args.mass, height_cm=args.height,
                                start_s=args.start, end_s=args.end, capture_fps=args.capture_fps,
                                distance_m=args.distance)
        result, folder = analyze_video(args.video, config, args.output)
    except (ValueError, RuntimeError, OSError) as exc:
        parser.exit(1, f'Error: {exc}\n')
    print(f"Sesión guardada: {folder}\nFotogramas: {result['processed_frames']}")
    for warning in result['warnings']:
        print(warning)


if __name__ == '__main__':
    main()
