"""Subset the Google Fonts sources (downloaded into ./dl) to Latin and pin variable fonts to regular weight.
Requires: pip install fonttools brotli"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
src='dl'; out='fonts'
files={'Caveat':'Caveat.ttf','PatrickHand':'PatrickHand-Regular.ttf.ttf','IndieFlower':'IndieFlower-Regular.ttf.ttf','SpecialElite':'SpecialElite.ttf','Lora':'Lora.ttf','Merriweather':'Merriweather.ttf','PlayfairDisplay':'PlayfairDisplay.ttf','Quicksand':'Quicksand.ttf'}
uni=list(range(0x20,0x7F))+list(range(0xA0,0x100))+[0x2013,0x2014,0x2018,0x2019,0x201C,0x201D,0x2022,0x2026,0x20AC,0x2122,0x2020,0x2021,0x2030,0x2039,0x203A,0x152,0x153,0x160,0x161,0x178,0x17D,0x17E,0x192,0x2C6,0x2DC,0x201A,0x201E]
for name,fn in files.items():
    f=TTFont(os.path.join(src,fn))
    if 'fvar' in f:
        axes={a.axisTag:(400 if a.axisTag=='wght' else a.defaultValue) for a in f['fvar'].axes}
        f=instancer.instantiateVariableFont(f,axes)
    opts=subset.Options(); opts.layout_features=['kern','liga']; opts.hinting=False; opts.name_IDs=[1,2,4,6]; opts.notdef_outline=True; opts.drop_tables+=['DSIG']
    s=subset.Subsetter(opts); s.populate(unicodes=uni); s.subset(f)
    f.save(f'{out}/{name}.ttf'); print(name, os.path.getsize(f'{out}/{name}.ttf'))
