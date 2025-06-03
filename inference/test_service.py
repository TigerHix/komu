#!/usr/bin/env python3
"""
Test the inference service health endpoint
"""

import requests
import time
import subprocess
import sys
from pathlib import Path

def test_health_endpoint():
    """Test if the inference service health endpoint works"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✓ Health endpoint working")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"✗ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Could not connect to service: {e}")
        return False

if __name__ == "__main__":
    print("Testing inference service health endpoint...")
    
    if test_health_endpoint():
        print("✓ Inference service is working!")
    else:
        print("✗ Inference service test failed")
        sys.exit(1)