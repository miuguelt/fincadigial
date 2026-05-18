import requests
import time
import threading
import statistics

BASE_URL = "http://localhost:5000/api/v1"

def hit_endpoint(endpoint, results):
    start = time.time()
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
        duration = time.time() - start
        results.append({
            'status': response.status_code,
            'duration': duration,
            'success': response.status_code == 200
        })
    except Exception as e:
        results.append({
            'status': 'error',
            'duration': time.time() - start,
            'success': False,
            'error': str(e)
        })

def run_stress_test(endpoint, concurrent_users=10, total_requests=100):
    print(f"Running stress test on {endpoint} with {concurrent_users} concurrent users...")
    results = []
    threads = []
    
    start_total = time.time()
    
    for i in range(total_requests):
        t = threading.Thread(target=hit_endpoint, args=(endpoint, results))
        threads.append(t)
        t.start()
        
        # Limit concurrency
        if len(threads) >= concurrent_users:
            for t in threads:
                t.join()
            threads = []
            
    for t in threads:
        t.join()
        
    end_total = time.time()
    
    successes = [r for r in results if r['success']]
    durations = [r['duration'] for r in successes]
    
    print(f"\nResults for {endpoint}:")
    print(f"Total Requests: {total_requests}")
    print(f"Successes: {len(successes)}")
    print(f"Failures: {total_requests - len(successes)}")
    if durations:
        print(f"Average Response Time: {statistics.mean(durations):.4f}s")
        print(f"Median Response Time: {statistics.median(durations):.4f}s")
        print(f"Max Response Time: {max(durations):.4f}s")
        print(f"Min Response Time: {min(durations):.4f}s")
    print(f"Total Duration: {end_total - start_total:.2f}s")
    print("-" * 30)

if __name__ == "__main__":
    # Test simple endpoint
    run_stress_test("/stress/simple", concurrent_users=20, total_requests=100)
    # Test database endpoint
    run_stress_test("/stress/database", concurrent_users=20, total_requests=100)
    # Test cache endpoint
    run_stress_test("/stress/cache", concurrent_users=20, total_requests=100)
