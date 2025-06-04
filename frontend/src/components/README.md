# Text Overlay Components Architecture

## Overview
The manga reader uses different text overlay approaches for different reading modes to optimize performance and maintainability.

## Components

### SvgTextOverlay
**Purpose**: Text overlays for single page modes (RTL/LTR)  
**Approach**: SVG with viewBox matching original image dimensions  
**Benefits**: 
- Automatic scaling with CSS transforms
- No coordinate calculations needed
- Perfect alignment at any zoom level

```tsx
<SvgTextOverlay
  textBlocks={textBlocks}
  imageSize={{ width: 1200, height: 1800 }}
  onBlockClick={handleClick}
/>
```

### ScrollTextOverlay  
**Purpose**: Text overlays for scrolling mode  
**Approach**: Absolutely positioned DOM elements  
**Benefits**:
- Works with multiple images in scroll container
- Supports complex tooltips and interactions
- Uses coordinate calculations for precise positioning

```tsx
<ScrollTextOverlay
  textBlocks={textBlocks}
  imageElement={imgElement}
  originalImageSize={{ width: 1200, height: 1800 }}
  onBlockClick={handleClick}
/>
```

## Why Two Approaches?

### Single Page Mode Challenges
- CSS transforms (zoom/pan) make coordinate calculations complex
- Need real-time positioning updates
- **Solution**: SVG inherits transforms naturally

### Scroll Mode Requirements  
- Multiple images with different positions
- No CSS transforms applied
- **Solution**: Traditional coordinate calculation works well

## Key Principles

1. **Separation of Concerns**: Each component handles one rendering mode
2. **Consistent Interface**: Both use same `onBlockClick` callback
3. **Performance**: Choose optimal approach for each use case
4. **Maintainability**: Simple, focused components

## Future Considerations

- Could potentially unify approaches using CSS transforms for scroll mode
- SVG approach could be extended to support tooltips if needed
- Consider extracting common text block logic to shared hook