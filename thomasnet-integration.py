#!/usr/bin/env python3
"""
Thomasnet Integration Script for CRM
This script bridges the Thomasnet scraper with the CRM system
"""

import sys
import json
import os
import subprocess
from pathlib import Path

def run_thomasnet_scraper(state, service, sort_order="Ascending", max_results=100, delay=2):
    """
    Run the Thomasnet scraper with specified parameters
    """
    try:
        # Get the path to the Thomasnet scraper
        scraper_path = Path(__file__).parent / "thomasnet-scraper" / "app" / "main.py"
        
        if not scraper_path.exists():
            return {"error": "Thomasnet scraper not found"}
        
        # Prepare command arguments
        cmd = [
            sys.executable,
            str(scraper_path),
            "--state", state,
            "--service", service,
            "--sort", sort_order,
            "--max-results", str(max_results),
            "--delay", str(delay)
        ]
        
        # Run the scraper
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=scraper_path.parent)
        
        if result.returncode != 0:
            return {"error": f"Scraper failed: {result.stderr}"}
        
        # Parse the output to get CSV file path
        output_lines = result.stdout.strip().split('\n')
        csv_file = None
        
        for line in output_lines:
            if "CSV saved to:" in line:
                csv_file = line.split("CSV saved to:")[-1].strip()
                break
        
        if not csv_file:
            return {"error": "No CSV file generated"}
        
        # Read the CSV file and convert to JSON
        prospects = []
        if os.path.exists(csv_file):
            with open(csv_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                if len(lines) > 1:  # Has header and data
                    headers = [h.strip() for h in lines[0].split(',')]
                    
                    for line in lines[1:]:
                        if line.strip():
                            values = [v.strip() for v in line.split(',')]
                            prospect = {}
                            for i, header in enumerate(headers):
                                if i < len(values):
                                    prospect[header.lower().replace(' ', '_')] = values[i]
                            prospects.append(prospect)
        
        return {
            "success": True,
            "prospects": prospects,
            "csv_file": csv_file,
            "count": len(prospects)
        }
        
    except Exception as e:
        return {"error": str(e)}

def get_available_states():
    """Get list of available states from constants.py"""
    try:
        constants_path = Path(__file__).parent / "thomasnet-scraper" / "app" / "constants.py"
        
        if not constants_path.exists():
            return []
        
        with open(constants_path, 'r') as f:
            content = f.read()
            
        # Extract states from the state_slug_map
        states = []
        in_map = False
        for line in content.split('\n'):
            if 'state_slug_map = {' in line:
                in_map = True
                continue
            if in_map and line.strip() == '}':
                break
            if in_map and '"' in line:
                # Extract state name from "State Name": ("slug", "abbr")
                state_name = line.split('"')[1]
                if state_name:
                    states.append(state_name)
        
        return sorted(states)
        
    except Exception as e:
        print(f"Error getting states: {e}", file=sys.stderr)
        return []

def get_available_services():
    """Get list of available services from constants.py"""
    try:
        constants_path = Path(__file__).parent / "thomasnet-scraper" / "app" / "constants.py"
        
        if not constants_path.exists():
            return []
        
        with open(constants_path, 'r') as f:
            content = f.read()
            
        # Extract services from the service_slug_map
        services = []
        in_map = False
        for line in content.split('\n'):
            if 'service_slug_map = {' in line:
                in_map = True
                continue
            if in_map and line.strip() == '}':
                break
            if in_map and '"' in line:
                # Extract service name from "Service Name": "slug"
                service_name = line.split('"')[1]
                if service_name:
                    services.append(service_name)
        
        return sorted(services)
        
    except Exception as e:
        print(f"Error getting services: {e}", file=sys.stderr)
        return []

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        return
    
    command = sys.argv[1]
    
    if command == "scrape":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "Missing required arguments: state service"}))
            return
        
        state = sys.argv[2]
        service = sys.argv[3]
        sort_order = sys.argv[4] if len(sys.argv) > 4 else "Ascending"
        max_results = int(sys.argv[5]) if len(sys.argv) > 5 else 100
        delay = int(sys.argv[6]) if len(sys.argv) > 6 else 2
        
        result = run_thomasnet_scraper(state, service, sort_order, max_results, delay)
        print(json.dumps(result))
        
    elif command == "states":
        states = get_available_states()
        print(json.dumps({"states": states}))
        
    elif command == "services":
        services = get_available_services()
        print(json.dumps({"services": services}))
        
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))

if __name__ == "__main__":
    main()
