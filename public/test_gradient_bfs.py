import numpy as np
from PIL import Image

def test_gradient_bfs():
    img_path = r"C:\Users\0624044757\.gemini\antigravity\brain\3a1fdda2-b125-4d75-85e2-484e8e2e38c5\media__1780924261447.jpg"
    img = Image.open(img_path)
    w, h = img.size
    data = np.array(img, dtype=np.float64)

    # Coordinates
    top_center = (224, 465)
    mid_center = (468, 465)

    for tolerance in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0]:
        visited = np.zeros((h, w), dtype=bool)
        queue = []
        
        # Initialize borders
        for x in range(w):
            queue.append((0, x))
            queue.append((h - 1, x))
            visited[0, x] = True
            visited[h - 1, x] = True
        for y in range(h):
            queue.append((y, 0))
            queue.append((y, w - 1))
            visited[y, 0] = True
            visited[y, w - 1] = True

        head = 0
        while head < len(queue):
            r, c = queue[head]
            head += 1
            curr_color = data[r, c]
            
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w:
                    if not visited[nr, nc]:
                        # Compute color difference
                        neighbor_color = data[nr, nc]
                        diff = np.max(np.abs(curr_color - neighbor_color))
                        if diff < tolerance:
                            visited[nr, nc] = True
                            queue.append((nr, nc))
                            
        leaked = visited[top_center[0], top_center[1]] or visited[mid_center[0], mid_center[1]]
        print(f"Tolerance: {tolerance:.2f} -> Visited count: {np.sum(visited)} ({(np.sum(visited)/(w*h)*100):.1f}%) -> Leaked: {leaked}")

if __name__ == "__main__":
    test_gradient_bfs()
