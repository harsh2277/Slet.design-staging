figma.showUI(__html__, { width: 400, height: 700 });

figma.ui.onmessage = async (msg) => {
    if (msg.type === "close-plugin") {
        figma.closePlugin();
    }

    if (msg.type === "resize") {
        figma.ui.resize(msg.width, msg.height);
    }

    if (msg.type === "create-variables") {
        try {
            // Get or create a collection for color variables
            let collection = figma.variables.getLocalVariableCollections()[0];
            if (!collection) {
                collection = figma.variables.createVariableCollection("Colors");
            }

            // Rename first mode to Light if needed
            if (collection.modes[0].name !== "Light") {
                collection.renameMode(collection.modes[0].modeId, "Light");
            }

            // Create dark mode if it doesn't exist
            let lightModeId = collection.modes[0].modeId;
            let darkModeId;

            if (collection.modes.length === 1) {
                darkModeId = collection.addMode("Dark");
            } else {
                darkModeId = collection.modes[1].modeId;
            }

            const colors = msg.colors;
            const includeStatus = msg.includeStatus;
            const includeNeutral = msg.includeNeutral;

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                // Remove # if present
                hex = hex.replace('#', '');

                // Handle 3-digit hex
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }

                // Validate hex
                if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                    throw new Error(`Invalid hex color: ${hex}`);
                }

                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;

                return { r, g, b };
            }

            // Create variables for each color
            for (const color of colors) {
                const colorName = color.name;
                const shades = color.shades;

                // Create variables for each shade
                for (let i = 0; i < shades.length; i++) {
                    const shadeNumber = Math.round((i + 1) * (1000 / shades.length));
                    const variableName = `${colorName}/${shadeNumber}`;

                    try {
                        // Check if variable already exists
                        let variable = figma.variables.getLocalVariables().find(v => v.name === variableName);

                        if (!variable) {
                            variable = figma.variables.createVariable(variableName, collection, "COLOR");
                        }

                        // Convert hex to RGB
                        const rgb = hexToRgb(shades[i]);

                        // Set the value for light mode
                        variable.setValueForMode(lightModeId, rgb);

                        // Set inverted value for dark mode (reverse the shade order)
                        const darkShadeIndex = shades.length - 1 - i;
                        const darkRgb = hexToRgb(shades[darkShadeIndex]);
                        variable.setValueForMode(darkModeId, darkRgb);
                    } catch (err) {
                        console.error(`Error creating variable ${variableName}:`, err);
                        throw new Error(`Failed to create ${variableName}: ${err.message}`);
                    }
                }
            }

            // Add status colors if toggle is on
            if (includeStatus) {
                const statusColors = {
                    'Success': ['#D1FAE5', '#6EE7B7', '#10B981', '#047857', '#064E3B'],
                    'Warning': ['#FEF3C7', '#FCD34D', '#F59E0B', '#B45309', '#78350F'],
                    'Error': ['#FEE2E2', '#FCA5A5', '#EF4444', '#B91C1C', '#7F1D1D'],
                    'Info': ['#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E3A8A']
                };

                for (const [colorName, shades] of Object.entries(statusColors)) {
                    for (let i = 0; i < shades.length; i++) {
                        const shadeNumber = (i + 1) * 200;
                        const variableName = `Status/${colorName}/${shadeNumber}`;

                        let variable = figma.variables.getLocalVariables().find(v => v.name === variableName);

                        if (!variable) {
                            variable = figma.variables.createVariable(variableName, collection, "COLOR");
                        }

                        const rgb = hexToRgb(shades[i]);
                        variable.setValueForMode(lightModeId, rgb);

                        // Set inverted value for dark mode
                        const darkShadeIndex = shades.length - 1 - i;
                        const darkRgb = hexToRgb(shades[darkShadeIndex]);
                        variable.setValueForMode(darkModeId, darkRgb);
                    }
                }
            }

            // Add neutral colors if toggle is on
            if (includeNeutral) {
                const neutralShades = [
                    '#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF',
                    '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'
                ];

                for (let i = 0; i < neutralShades.length; i++) {
                    const shadeNumber = (i + 1) * 100;
                    const variableName = `Neutral/${shadeNumber}`;

                    let variable = figma.variables.getLocalVariables().find(v => v.name === variableName);

                    if (!variable) {
                        variable = figma.variables.createVariable(variableName, collection, "COLOR");
                    }

                    const rgb = hexToRgb(neutralShades[i]);
                    variable.setValueForMode(lightModeId, rgb);

                    // Set inverted value for dark mode
                    const darkShadeIndex = neutralShades.length - 1 - i;
                    const darkRgb = hexToRgb(neutralShades[darkShadeIndex]);
                    variable.setValueForMode(darkModeId, darkRgb);
                }
            }

            figma.ui.postMessage({ type: 'variables-created', success: true });
            figma.notify('Variables created successfully!');
        } catch (error) {
            figma.ui.postMessage({ type: 'variables-created', success: false, error: error.message });
            figma.notify('Error creating variables: ' + error.message);
        }
    }

    if (msg.type === "create-spacing-tokens") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Get or create a collection for spacing variables
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Spacing");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Spacing");
            }

            // Create Desktop, Tablet, and Mobile modes if they don't exist
            let desktopModeId, tabletModeId, mobileModeId;

            if (collection.modes.length === 1) {
                // Rename default mode to Desktop
                collection.renameMode(collection.modes[0].modeId, "Desktop");
                desktopModeId = collection.modes[0].modeId;
                // Add Tablet and Mobile modes
                tabletModeId = collection.addMode("Tablet");
                mobileModeId = collection.addMode("Mobile");
            } else if (collection.modes.length === 2) {
                desktopModeId = collection.modes[0].modeId;
                tabletModeId = collection.modes[1].modeId;
                mobileModeId = collection.addMode("Mobile");
            } else if (collection.modes.length >= 3) {
                desktopModeId = collection.modes[0].modeId;
                tabletModeId = collection.modes[1].modeId;
                mobileModeId = collection.modes[2].modeId;
            }

            // Generate spacing tokens (all even numbers)
            for (let i = 0; i < numberOfTokens; i++) {
                const desktopValue = baseValue * i;
                // Tablet uses 75% of desktop value (rounded to even number)
                const tabletValue = Math.round((desktopValue * 0.75) / 2) * 2;
                // Mobile uses 50% of desktop value (rounded to even number)
                const mobileValue = Math.round((desktopValue * 0.5) / 2) * 2;

                const variableName = `spacing-${desktopValue}px`;

                // Check if variable already exists
                let variable = figma.variables.getLocalVariables().find(v => v.name === variableName);

                if (!variable) {
                    variable = figma.variables.createVariable(variableName, collection, "FLOAT");
                }

                // Set different values for each mode
                variable.setValueForMode(desktopModeId, desktopValue);
                variable.setValueForMode(tabletModeId, tabletValue);
                variable.setValueForMode(mobileModeId, mobileValue);
            }

            figma.notify(`Created ${numberOfTokens} spacing tokens with base ${baseValue}px (Desktop: 100%, Tablet: 75%, Mobile: 50%)`);
        } catch (error) {
            figma.notify('Error creating spacing tokens: ' + error.message);
        }
    }
};
