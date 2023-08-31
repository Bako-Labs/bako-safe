import React from 'react';
export const Button = (props) => {
    const { children, backgroundColor, color, style } = props;
    let _style = style || {};
    /** Override Defaults */
    if (backgroundColor && _style)
        _style.backgroundColor = backgroundColor;
    if (color && _style)
        _style.color = color;
    return (React.createElement("button", Object.assign({ style: _style }, props), children));
};
//# sourceMappingURL=Button.js.map