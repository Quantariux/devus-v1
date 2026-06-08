import numpy as np
from PIL import Image

def test_distance_bfs():
    img_path = r"C:\Users\0624044757\.gemini\antigravity\brain\3a1fdda2-b125-4d75-85e2-484e8e2e38c5\media__1780924261447.jpg"
    img = Image.open(img_path)
    w, h = img.size
    data = np.array(img, dtype=np.float64)

    # Coordinates
    x = np.arange(w)
    y = np.arange(h)
    xx, yy = np.meshgrid(x, y)

    border_w = 70
    border_h = 100
    is_border = (xx < border_w) | (xx > w - border_w) | (yy < border_h) | (yy > h - border_h)

    nx = xx / w
    ny = yy / h
    nx_fit = nx[is_border]
    ny_fit = ny[is_border]

    A = np.column_stack([
        np.ones_like(nx_fit),
        nx_fit, ny_fit,
        nx_fit**2, ny_fit**2, nx_fit*ny_fit,
        nx_fit**3, ny_fit**3, nx_fit**2*ny_fit, nx_fit*ny_fit**2
    ])

    A_all = np.stack([
        np.ones_like(nx),
        nx, ny,
        nx**2, ny**2, nx*ny,
        nx**3, ny**3, nx**2*ny, nx*ny**2
    ], axis=-1)

    bg = np.zeros_like(data)
    for c in range(3):
        fit_c = data[:, :, c][is_border]
        coeff_c, _, _, _ = np.linalg.lstsq(A, fit_c, rcond=None)
        bg[:, :, c] = np.dot(A_all, coeff_c)

    diff = data - bg
    dist = np.sqrt(np.sum(diff**2, axis=-1))

    # Test thresholds from 55 to 80
    top_center = (224, 465)
    mid_center = (468, 465)

    for threshold in range(50, 81, 2):
        # A pixel is a background candidate if dist < threshold
        is_bg_candidate = dist < threshold
        
        visited = np.zeros_like(is_bg_candidate, dtype=bool)
        queue = []
        for x_idx in range(w):
            queue.append((0, x_idx))
            queue.append((h - 1, x_idx))
            visited[0, x_idx] = True
            visited[h - 1, x_idx] = True
        for y_idx in range(h):
            queue.append((y_idx, 0))
            queue.append((y_idx, w - 1))
            visited[y_idx, 0] = True
            visited[y_idx, w - 1] = True

        head = 0
        while head < len(queue):
            r, c = queue[head]
            head += 1
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w:
                    if not visited[nr, nc] and is_bg_candidate[nr, nc]:
                        visited[nr, nc] = True
                        queue.append((nr, nc))
                        
        leaked = visited[top_center[0], top_center[1]] or visited[mid_center[0], mid_center[1]]
        print(f"Threshold: {threshold:.1f} -> Visited count: {np.sum(visited)} ({(np.sum(visited)/(w*h)*100):.1f}%) -> Leaked: {leaked}")

if __name__ == "__main__":
    test_distance_bfs()
