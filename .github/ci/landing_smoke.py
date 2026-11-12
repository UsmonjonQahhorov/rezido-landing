"""Read-only smoke of the local production Next server in explicit demo mode."""
import json,os,subprocess,tempfile,time,urllib.request
env={**os.environ,'PORT':'3910','REZIDO_API_URL':''}
with tempfile.TemporaryFile() as logs:
    server=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3910'],env=env,stdout=logs,stderr=subprocess.STDOUT)
    try:
        data=None
        for _ in range(60):
            try:
                with urllib.request.urlopen('http://127.0.0.1:3910/api/listings',timeout=2) as response:data=json.load(response)
                break
            except (OSError,ValueError):time.sleep(.25)
        if not isinstance(data,dict) or data.get('source')!='demo' or not isinstance(data.get('results'),list):raise RuntimeError('Demo API contract failed')
        paths=['/','/map','/privacy','/terms','/robots.txt','/opengraph-image']
        if data['results']:paths.append('/property/'+data['results'][0]['id'])
        for path in paths:
            with urllib.request.urlopen('http://127.0.0.1:3910'+path,timeout=15) as response:
                if response.status!=200 or response.url!='http://127.0.0.1:3910'+path:raise RuntimeError('Route status/redirect mismatch')
        print('Local production routes/demo API passed; no backend or legal-readiness claim.')
    finally:
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill();server.wait()
