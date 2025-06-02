import yaml
import os

# Load the YAML file and expose it as a module variable
yaml_path = os.path.join(os.path.dirname(__file__), 'schedules_rag.yaml')
with open(yaml_path, 'r') as file:
    schedules_rag = yaml.safe_load(file)