import http.server
import socketserver
import json
import base64
import os
import time

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/upload':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                place_id = data.get('place_id', 'img')
                images = data.get('images', [])
                
                saved_files = []
                if not os.path.exists('resimler'):
                    os.makedirs('resimler')
                    
                for i, img in enumerate(images):
                    header, encoded = img['data'].split(",", 1)
                    file_ext = ".png"
                    if "jpeg" in header or "jpg" in header: file_ext = ".jpg"
                    
                    new_filename = f"{place_id}_{int(time.time()*1000)}_{i}{file_ext}"
                    filepath = os.path.join('resimler', new_filename)
                    
                    with open(filepath, "wb") as f:
                        f.write(base64.b64decode(encoded))
                        
                    saved_files.append(f"resimler/{new_filename}")
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "files": saved_files}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
                
        elif self.path == '/delete_images':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                images_to_delete = data.get('images', [])
                
                for img_path in images_to_delete:
                    # Guvenlik icin sadece resimler/ klasorundekilere izin ver
                    if img_path.startswith('resimler/') and not '..' in img_path:
                        if os.path.exists(img_path):
                            os.remove(img_path)
                            
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
                
        elif self.path == '/save_data':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                places = data.get('places', [])
                routes = data.get('routes', [])
                
                js_content = f"""const ladikMahalleleri = {json.dumps(places, indent=4, ensure_ascii=False)};
const ladikRoutes = {json.dumps(routes, indent=4, ensure_ascii=False)};

function getPlaces() {{ return ladikMahalleleri; }}
function getRoutes() {{ return ladikRoutes; }}

async function savePlaces(places) {{
    try {{
        await fetch('/save_data', {{
            method: 'POST',
            headers: {{ 'Content-Type': 'application/json' }},
            body: JSON.stringify({{ places: places, routes: getRoutes() }})
        }});
    }} catch(e) {{ alert("Veri kaydedilemedi. server.py çalışmıyor olabilir."); }}
}}

async function saveRoutes(routes) {{
    try {{
        await fetch('/save_data', {{
            method: 'POST',
            headers: {{ 'Content-Type': 'application/json' }},
            body: JSON.stringify({{ places: getPlaces(), routes: routes }})
        }});
    }} catch(e) {{ alert("Veri kaydedilemedi. server.py çalışmıyor olabilir."); }}
}}
"""
                with open("data.js", "w", encoding="utf-8") as f:
                    f.write(js_content)
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        else:
            self.send_error(404, "Not Found")

print("==================================================")
print(f"Sunucu baslatildi. Lutfen tarayicinizdan asagidaki adresi acin:")
print(f"http://localhost:{PORT}")
print("==================================================")

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    httpd.serve_forever()
