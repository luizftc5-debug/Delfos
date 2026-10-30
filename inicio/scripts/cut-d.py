# Recorta o D do último frame (GrabCut) e gera assets/delfos-d.png com alpha.
# Uso: ffmpeg -i video.mp4 -vf "select=eq(n\,238),colorlevels=rimin=0.035:gimin=0.035:bimin=0.035" -frames:v 1 -update 1 probe/last_graded.png && python3 scripts/cut-d.py
# Imprime 'bbox master x y w h' -> copie para D_LAYER no js/delfos-hero.js.
import cv2, numpy as np
im = cv2.imread('probe/last_graded.png')
X,Y,W,H = 730,30,540,600
roi = im[Y:Y+H, X:X+W].copy()
lum = roi.max(axis=2).astype(np.int32)
hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
mask = np.full(lum.shape, cv2.GC_PR_BGD, np.uint8)
mask[lum > 60] = cv2.GC_PR_FGD
mask[lum > 140] = cv2.GC_FGD
mask[lum < 22] = cv2.GC_BGD
bgd = np.zeros((1,65),np.float64); fgd = np.zeros((1,65),np.float64)
cv2.grabCut(roi, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
fg = np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
# keep largest connected component
n,lab,stats,_ = cv2.connectedComponentsWithStats(fg)
keep=[i for i in range(1,n) if stats[i,cv2.CC_STAT_AREA]>3000]
print('components kept', [int(stats[i,cv2.CC_STAT_AREA]) for i in keep], 'dropped', sorted([int(stats[i,cv2.CC_STAT_AREA]) for i in range(1,n) if i not in keep])[-5:])
fg = np.where(np.isin(lab,keep),255,0).astype(np.uint8)
# fill small holes inside (but not the big inner counter)
inv = 255-fg
n2,lab2,st2,_ = cv2.connectedComponentsWithStats(inv)
for i in range(1,n2):
    if st2[i,cv2.CC_STAT_AREA] < 400: fg[lab2==i]=255
cv2.imwrite('probe/fg_raw.png', fg)
# soft edge: erode 1px then blur
fg = cv2.erode(fg, np.ones((3,3),np.uint8), 1)
alpha = cv2.GaussianBlur(fg,(0,0),1.1)
ys,xs = np.nonzero(alpha>2)
x0,x1,y0,y1 = xs.min(),xs.max()+1,ys.min(),ys.max()+1
pad=6; x0=max(0,x0-pad);y0=max(0,y0-pad);x1=min(W,x1+pad);y1=min(H,y1+pad)
rgba = cv2.cvtColor(roi, cv2.COLOR_BGR2BGRA); rgba[:,:,3]=alpha
rgba = rgba[y0:y1,x0:x1]
cv2.imwrite('probe/d_cut.png', rgba)
print('bbox master', X+x0, Y+y0, x1-x0, y1-y0)
# preview on red & on white
a = rgba[:,:,3:4]/255.0
for name,col in [('red',(40,40,200)),('grey',(128,128,128))]:
    bg = np.zeros_like(rgba[:,:,:3]); bg[:]=col
    comp = (rgba[:,:,:3]*a + bg*(1-a)).astype(np.uint8)
    cv2.imwrite(f'probe/d_on_{name}.png', comp)
