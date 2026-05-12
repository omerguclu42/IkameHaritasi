import sys
import xml.etree.ElementTree as ET

source = r'C:\Users\Ömer Faruk Güçlü\.gemini\antigravity\brain\36c48601-c134-47cb-8acf-0010039a738b\.system_generated\steps\30\content.md'
with open(source, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract SVG
start = content.find('<svg')
end = content.find('</svg>') + 6
svg_content = content[start:end]

# Change fill color
svg_content = svg_content.replace('fill="#000000"', 'fill="#f57f30"')

with open(r'c:\Users\Ömer Faruk Güçlü\Desktop\İkameHaritası\İkameHaritası\turkey-map.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)
