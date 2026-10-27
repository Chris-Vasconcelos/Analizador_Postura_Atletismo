class AnalysisConfig:
    pass

class AnalysisResult:
    def __init__(self, video_path):
        self.video_path = video_path
        self.fps = 30.0
        self.duration_seconds = 0.0
        self.summary_metrics = {
            'mean_knee_angle_right': 0.0,
            'mean_knee_angle_left': 0.0,
            'mean_hip_angle_right': 0.0,
            'mean_hip_angle_left': 0.0,
            'mean_trunk_lean': 0.0,
            'knee_asymmetry': 0.0,
            'hip_asymmetry': 0.0
        }
        self.reaction_time_ms = 0
        self.block_clearance_time_ms = 0
        self.contacts_summary = {
            'total_contacts': 0,
            'average_flight_time_ms': 0,
            'average_ground_time_ms': 0
        }
        self.reliability_report = {
            'validity_percentage': 100.0,
            'valid_frames': 0,
            'total_frames': 0
        }
        self.time_series = {
            'knee_angle_right': [],
            'knee_angle_left': [],
            'hip_angle_right': [],
            'trunk_lean': []
        }
        self.landmarks_history = []

class BiomechSprintAnalyzer:
    def __init__(self, video_path, config):
        self.video_path = video_path
        self.config = config

    def analyze(self):
        # Devuelve un objeto mockeado para que no rompa el dashboard
        return AnalysisResult(self.video_path)
