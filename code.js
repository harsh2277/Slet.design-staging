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
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Colors");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Colors");
            }

            // Get mode IDs
            let lightModeId = collection.modes[0].modeId;
            let darkModeId;

            // Rename first mode to Light if needed
            if (collection.modes[0].name !== "Light") {
                collection.renameMode(lightModeId, "Light");
            }

            // Create dark mode if it doesn't exist
            if (collection.modes.length === 1) {
                darkModeId = collection.addMode("Dark");
            } else {
                darkModeId = collection.modes[1].modeId;
                // Rename second mode to Dark if needed
                if (collection.modes[1].name !== "Dark") {
                    collection.renameMode(darkModeId, "Dark");
                }
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
                        // Check if variable already exists in this collection
                        let variable = figma.variables.getLocalVariables().find(v =>
                            v.name === variableName && v.variableCollectionId === collection.id
                        );

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
                    'Success': ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B'],
                    'Warning': ['#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F'],
                    'Error': ['#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'],
                    'Info': ['#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A']
                };

                for (const [colorName, shades] of Object.entries(statusColors)) {
                    for (let i = 0; i < shades.length; i++) {
                        const shadeNumber = (i + 1) * 100;
                        const variableName = `Status/${colorName}/${shadeNumber}`;

                        let variable = figma.variables.getLocalVariables().find(v =>
                            v.name === variableName && v.variableCollectionId === collection.id
                        );

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

                    let variable = figma.variables.getLocalVariables().find(v =>
                        v.name === variableName && v.variableCollectionId === collection.id
                    );

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

    if (msg.type === "create-spacing-doc") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Spacing";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Spacing";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Generate using a fixed base for best result.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            const tokenGrid = figma.createFrame();
            tokenGrid.name = "Token Grid";
            tokenGrid.layoutMode = "HORIZONTAL";
            tokenGrid.primaryAxisSizingMode = "AUTO";
            tokenGrid.counterAxisSizingMode = "AUTO";
            tokenGrid.itemSpacing = 2;
            tokenGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            const gridBorderColor = hexToRgb('#D5D5D6');
            tokenGrid.strokes = [{ type: 'SOLID', color: gridBorderColor }];
            tokenGrid.strokeWeight = 1;
            tokenGrid.cornerRadius = 8;
            tokenGrid.cornerRadius = 8;

            // Generate spacing token cards
            for (let i = 0; i < numberOfTokens; i++) {
                const spacingValue = baseValue * i;

                const tokenCard = figma.createFrame();
                tokenCard.name = `${i}`;
                tokenCard.layoutMode = "VERTICAL";
                tokenCard.primaryAxisSizingMode = "AUTO";
                tokenCard.counterAxisSizingMode = "FIXED";
                tokenCard.resize(160, 156);
                tokenCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Preview Frame
                const previewFrame = figma.createFrame();
                previewFrame.name = "Preview Frame";
                previewFrame.layoutMode = "HORIZONTAL";
                previewFrame.primaryAxisSizingMode = "FIXED";
                previewFrame.counterAxisSizingMode = "FIXED";
                previewFrame.resize(160, 100);
                previewFrame.primaryAxisAlignItems = "CENTER";
                previewFrame.counterAxisAlignItems = "CENTER";
                previewFrame.itemSpacing = spacingValue;
                previewFrame.paddingTop = 16;
                previewFrame.paddingBottom = 16;
                previewFrame.paddingLeft = 16;
                previewFrame.paddingRight = 16;
                previewFrame.fills = [{ type: 'SOLID', color: hexToRgb('#E0E8FF') }];

                // Create two circles with spacing between them
                const circle1 = figma.createFrame();
                circle1.name = "Ellipse 1";
                circle1.resize(34, 34);
                circle1.fills = [{ type: 'SOLID', color: hexToRgb('#ADC2FF') }];
                circle1.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
                circle1.strokeWeight = 0.5;
                circle1.strokeAlign = "INSIDE";
                circle1.dashPattern = [2, 2];
                circle1.cornerRadius = 34;

                const circle2 = figma.createFrame();
                circle2.name = "Ellipse 2";
                circle2.resize(34, 34);
                circle2.fills = [{ type: 'SOLID', color: hexToRgb('#ADC2FF') }];
                circle2.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
                circle2.strokeWeight = 0.5;
                circle2.strokeAlign = "INSIDE";
                circle2.dashPattern = [2, 2];
                circle2.cornerRadius = 34;

                previewFrame.appendChild(circle1);
                previewFrame.appendChild(circle2);

                // Token Info
                const tokenInfo = figma.createFrame();
                tokenInfo.name = "Token Info";
                tokenInfo.layoutMode = "VERTICAL";
                tokenInfo.primaryAxisSizingMode = "AUTO";
                tokenInfo.counterAxisSizingMode = "FIXED";
                tokenInfo.resize(160, 56);
                tokenInfo.itemSpacing = 6;
                tokenInfo.paddingTop = 12;
                tokenInfo.paddingBottom = 12;
                tokenInfo.paddingLeft = 12;
                tokenInfo.paddingRight = 12;
                tokenInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Token name
                const tokenName = figma.createText();
                tokenName.characters = `Spacing-${spacingValue}px`;
                tokenName.fontSize = 12;
                tokenName.fontName = { family: "Inter", style: "Medium" };
                tokenName.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                // Token value
                const tokenValue = figma.createText();
                tokenValue.characters = `${spacingValue}px`;
                tokenValue.fontSize = 9;
                tokenValue.fontName = { family: "Inter", style: "Regular" };
                tokenValue.fills = [{ type: 'SOLID', color: hexToRgb('#7F7F7F') }];

                tokenInfo.appendChild(tokenName);
                tokenInfo.appendChild(tokenValue);

                tokenCard.appendChild(previewFrame);
                tokenCard.appendChild(tokenInfo);
                tokenGrid.appendChild(tokenCard);
            }

            frame.appendChild(tokenGrid);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Spacing Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating spacing doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-padding-tokens") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Get or create a collection for padding variables
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Padding");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Padding");
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

            // Generate padding tokens (all even numbers)
            for (let i = 0; i < numberOfTokens; i++) {
                const desktopValue = baseValue * i;
                // Tablet uses 75% of desktop value (rounded to even number)
                const tabletValue = Math.round((desktopValue * 0.75) / 2) * 2;
                // Mobile uses 50% of desktop value (rounded to even number)
                const mobileValue = Math.round((desktopValue * 0.5) / 2) * 2;

                const variableName = `padding-${desktopValue}px`;

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

            figma.notify(`Created ${numberOfTokens} padding tokens with base ${baseValue}px (Desktop: 100%, Tablet: 75%, Mobile: 50%)`);
        } catch (error) {
            figma.notify('Error creating padding tokens: ' + error.message);
        }
    }

    if (msg.type === "create-padding-doc") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Padding";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Padding";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Generate using a fixed base for best result.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            // Create padding tokens grid
            const tokenGrid = figma.createFrame();
            tokenGrid.name = "Token Grid";
            tokenGrid.layoutMode = "HORIZONTAL";
            tokenGrid.primaryAxisSizingMode = "AUTO";
            tokenGrid.counterAxisSizingMode = "AUTO";
            tokenGrid.itemSpacing = 2;
            tokenGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            const gridBorderColor = hexToRgb('#D5D5D6');
            tokenGrid.strokes = [{ type: 'SOLID', color: gridBorderColor }];
            tokenGrid.strokeWeight = 1;
            tokenGrid.cornerRadius = 8;

            // Generate padding token cards
            for (let i = 0; i < numberOfTokens; i++) {
                const paddingValue = baseValue * i;

                const tokenCard = figma.createFrame();
                tokenCard.name = `${i}`;
                tokenCard.layoutMode = "VERTICAL";
                tokenCard.primaryAxisSizingMode = "AUTO";
                tokenCard.counterAxisSizingMode = "FIXED";
                tokenCard.resize(160, 156);
                tokenCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Preview Frame
                const previewFrame = figma.createFrame();
                previewFrame.name = "Preview Frame";
                previewFrame.layoutMode = "HORIZONTAL";
                previewFrame.primaryAxisSizingMode = "FIXED";
                previewFrame.counterAxisSizingMode = "FIXED";
                previewFrame.resize(160, 100);
                previewFrame.primaryAxisAlignItems = "CENTER";
                previewFrame.counterAxisAlignItems = "CENTER";
                previewFrame.fills = [{ type: 'SOLID', color: hexToRgb('#E0E8FF') }];

                // Create inner box with padding
                const innerBox = figma.createFrame();
                innerBox.name = "Inner Box";
                innerBox.layoutMode = "VERTICAL";
                innerBox.primaryAxisSizingMode = "AUTO";
                innerBox.counterAxisSizingMode = "AUTO";
                innerBox.fills = [{ type: 'SOLID', color: hexToRgb('#ADC2FF') }];
                innerBox.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
                innerBox.strokeWeight = 0.5;
                innerBox.strokeAlign = "INSIDE";
                innerBox.dashPattern = [2, 2];
                innerBox.cornerRadius = 2;
                innerBox.paddingTop = paddingValue;
                innerBox.paddingBottom = paddingValue;
                innerBox.paddingLeft = paddingValue;
                innerBox.paddingRight = paddingValue;
                innerBox.primaryAxisAlignItems = "CENTER";
                innerBox.counterAxisAlignItems = "CENTER";

                // Create center element
                const centerElement = figma.createFrame();
                centerElement.name = "Center";
                centerElement.resize(34, 34);
                centerElement.fills = [{ type: 'SOLID', color: hexToRgb('#6699FF') }];
                centerElement.cornerRadius = 2;

                innerBox.appendChild(centerElement);
                previewFrame.appendChild(innerBox);

                // Token Info
                const tokenInfo = figma.createFrame();
                tokenInfo.name = "Token Info";
                tokenInfo.layoutMode = "VERTICAL";
                tokenInfo.primaryAxisSizingMode = "AUTO";
                tokenInfo.counterAxisSizingMode = "FIXED";
                tokenInfo.resize(160, 56);
                tokenInfo.itemSpacing = 6;
                tokenInfo.paddingTop = 12;
                tokenInfo.paddingBottom = 12;
                tokenInfo.paddingLeft = 12;
                tokenInfo.paddingRight = 12;
                tokenInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Token name
                const tokenName = figma.createText();
                tokenName.characters = `Padding-${paddingValue}px`;
                tokenName.fontSize = 12;
                tokenName.fontName = { family: "Inter", style: "Medium" };
                tokenName.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                // Token value
                const tokenValue = figma.createText();
                tokenValue.characters = `${paddingValue}px`;
                tokenValue.fontSize = 9;
                tokenValue.fontName = { family: "Inter", style: "Regular" };
                tokenValue.fills = [{ type: 'SOLID', color: hexToRgb('#7F7F7F') }];

                tokenInfo.appendChild(tokenName);
                tokenInfo.appendChild(tokenValue);

                tokenCard.appendChild(previewFrame);
                tokenCard.appendChild(tokenInfo);
                tokenGrid.appendChild(tokenCard);
            }

            frame.appendChild(tokenGrid);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Padding Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating padding doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-radius-tokens") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Get or create a collection for radius variables
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Radius");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Radius");
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

            // Generate radius tokens (all even numbers)
            for (let i = 0; i < numberOfTokens; i++) {
                const desktopValue = baseValue * i;
                // Tablet uses 75% of desktop value (rounded to even number)
                const tabletValue = Math.round((desktopValue * 0.75) / 2) * 2;
                // Mobile uses 50% of desktop value (rounded to even number)
                const mobileValue = Math.round((desktopValue * 0.5) / 2) * 2;

                const variableName = `radius-${desktopValue}px`;

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

            figma.notify(`Created ${numberOfTokens} radius tokens with base ${baseValue}px (Desktop: 100%, Tablet: 75%, Mobile: 50%)`);
        } catch (error) {
            figma.notify('Error creating radius tokens: ' + error.message);
        }
    }

    if (msg.type === "create-radius-doc") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Radius";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Radius";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Generate using a fixed base for best result.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            const tokenGrid = figma.createFrame();
            tokenGrid.name = "Token Grid";
            tokenGrid.layoutMode = "HORIZONTAL";
            tokenGrid.primaryAxisSizingMode = "AUTO";
            tokenGrid.counterAxisSizingMode = "AUTO";
            tokenGrid.itemSpacing = 2;
            tokenGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            const gridBorderColor = hexToRgb('#D5D5D6');
            tokenGrid.strokes = [{ type: 'SOLID', color: gridBorderColor }];
            tokenGrid.strokeWeight = 1;
            tokenGrid.cornerRadius = 8;

            // Generate radius token cards
            for (let i = 0; i < numberOfTokens; i++) {
                const radiusValue = baseValue * i;

                const tokenCard = figma.createFrame();
                tokenCard.name = `${i}`;
                tokenCard.layoutMode = "VERTICAL";
                tokenCard.primaryAxisSizingMode = "AUTO";
                tokenCard.counterAxisSizingMode = "FIXED";
                tokenCard.resize(160, 156);
                tokenCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Preview Frame
                const previewFrame = figma.createFrame();
                previewFrame.name = "Preview Frame";
                previewFrame.layoutMode = "HORIZONTAL";
                previewFrame.primaryAxisSizingMode = "FIXED";
                previewFrame.counterAxisSizingMode = "FIXED";
                previewFrame.resize(160, 100);
                previewFrame.primaryAxisAlignItems = "CENTER";
                previewFrame.counterAxisAlignItems = "CENTER";
                previewFrame.paddingTop = 16;
                previewFrame.paddingBottom = 16;
                previewFrame.paddingLeft = 16;
                previewFrame.paddingRight = 16;
                previewFrame.fills = [{ type: 'SOLID', color: hexToRgb('#E0E8FF') }];

                // Create rounded rectangle to show radius
                const radiusBox = figma.createFrame();
                radiusBox.name = "Radius Box";
                radiusBox.resize(68, 68);
                radiusBox.fills = [{ type: 'SOLID', color: hexToRgb('#ADC2FF') }];
                radiusBox.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
                radiusBox.strokeWeight = 0.5;
                radiusBox.strokeAlign = "INSIDE";
                radiusBox.dashPattern = [2, 2];
                radiusBox.cornerRadius = radiusValue;

                previewFrame.appendChild(radiusBox);

                // Token Info
                const tokenInfo = figma.createFrame();
                tokenInfo.name = "Token Info";
                tokenInfo.layoutMode = "VERTICAL";
                tokenInfo.primaryAxisSizingMode = "AUTO";
                tokenInfo.counterAxisSizingMode = "FIXED";
                tokenInfo.resize(160, 56);
                tokenInfo.itemSpacing = 6;
                tokenInfo.paddingTop = 12;
                tokenInfo.paddingBottom = 12;
                tokenInfo.paddingLeft = 12;
                tokenInfo.paddingRight = 12;
                tokenInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Token name
                const tokenName = figma.createText();
                tokenName.characters = `Radius-${radiusValue}px`;
                tokenName.fontSize = 12;
                tokenName.fontName = { family: "Inter", style: "Medium" };
                tokenName.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                // Token value
                const tokenValue = figma.createText();
                tokenValue.characters = `${radiusValue}px`;
                tokenValue.fontSize = 9;
                tokenValue.fontName = { family: "Inter", style: "Regular" };
                tokenValue.fills = [{ type: 'SOLID', color: hexToRgb('#7F7F7F') }];

                tokenInfo.appendChild(tokenName);
                tokenInfo.appendChild(tokenValue);

                tokenCard.appendChild(previewFrame);
                tokenCard.appendChild(tokenInfo);
                tokenGrid.appendChild(tokenCard);
            }

            frame.appendChild(tokenGrid);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Radius Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating radius doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-stroke-tokens") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Get or create a collection for stroke variables
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Stroke");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Stroke");
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

            // Generate stroke tokens
            for (let i = 0; i < numberOfTokens; i++) {
                const desktopValue = baseValue * i;
                // Tablet uses 75% of desktop value
                const tabletValue = Math.round((desktopValue * 0.75) * 10) / 10;
                // Mobile uses 50% of desktop value
                const mobileValue = Math.round((desktopValue * 0.5) * 10) / 10;

                // Format the variable name to replace decimal point with underscore
                const formattedValue = desktopValue.toString().replace('.', '_');
                const variableName = `stroke-${formattedValue}px`;

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

            figma.notify(`Created ${numberOfTokens} stroke tokens with base ${baseValue}px (Desktop: 100%, Tablet: 75%, Mobile: 50%)`);
        } catch (error) {
            figma.notify('Error creating stroke tokens: ' + error.message);
        }
    }

    if (msg.type === "create-stroke-doc") {
        try {
            const baseValue = msg.baseValue;
            const numberOfTokens = msg.numberOfTokens;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Stroke";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Stroke";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Generate using a fixed base for best result.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            const tokenGrid = figma.createFrame();
            tokenGrid.name = "Token Grid";
            tokenGrid.layoutMode = "HORIZONTAL";
            tokenGrid.primaryAxisSizingMode = "AUTO";
            tokenGrid.counterAxisSizingMode = "AUTO";
            tokenGrid.itemSpacing = 2;
            tokenGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            const gridBorderColor = hexToRgb('#D5D5D6');
            tokenGrid.strokes = [{ type: 'SOLID', color: gridBorderColor }];
            tokenGrid.strokeWeight = 1;
            tokenGrid.cornerRadius = 8;

            // Generate stroke token cards
            for (let i = 0; i < numberOfTokens; i++) {
                const strokeValue = baseValue * i;

                const tokenCard = figma.createFrame();
                tokenCard.name = `${i}`;
                tokenCard.layoutMode = "VERTICAL";
                tokenCard.primaryAxisSizingMode = "AUTO";
                tokenCard.counterAxisSizingMode = "FIXED";
                tokenCard.resize(160, 156);
                tokenCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Preview Frame
                const previewFrame = figma.createFrame();
                previewFrame.name = "Preview Frame";
                previewFrame.layoutMode = "HORIZONTAL";
                previewFrame.primaryAxisSizingMode = "FIXED";
                previewFrame.counterAxisSizingMode = "FIXED";
                previewFrame.resize(160, 100);
                previewFrame.primaryAxisAlignItems = "CENTER";
                previewFrame.counterAxisAlignItems = "CENTER";
                previewFrame.paddingTop = 16;
                previewFrame.paddingBottom = 16;
                previewFrame.paddingLeft = 16;
                previewFrame.paddingRight = 16;
                previewFrame.fills = [{ type: 'SOLID', color: hexToRgb('#E0E8FF') }];

                // Create rectangle with stroke to show border width
                const strokeBox = figma.createFrame();
                strokeBox.name = "Stroke Box";
                strokeBox.resize(68, 68);
                strokeBox.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
                strokeBox.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
                strokeBox.strokeWeight = strokeValue;
                strokeBox.strokeAlign = "INSIDE";
                strokeBox.cornerRadius = 4;

                previewFrame.appendChild(strokeBox);

                // Token Info
                const tokenInfo = figma.createFrame();
                tokenInfo.name = "Token Info";
                tokenInfo.layoutMode = "VERTICAL";
                tokenInfo.primaryAxisSizingMode = "AUTO";
                tokenInfo.counterAxisSizingMode = "FIXED";
                tokenInfo.resize(160, 56);
                tokenInfo.itemSpacing = 6;
                tokenInfo.paddingTop = 12;
                tokenInfo.paddingBottom = 12;
                tokenInfo.paddingLeft = 12;
                tokenInfo.paddingRight = 12;
                tokenInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Token name
                const formattedValue = strokeValue.toString().replace('.', '_');
                const tokenName = figma.createText();
                tokenName.characters = `Stroke-${formattedValue}px`;
                tokenName.fontSize = 12;
                tokenName.fontName = { family: "Inter", style: "Medium" };
                tokenName.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                // Token value
                const tokenValue = figma.createText();
                tokenValue.characters = `${strokeValue}px`;
                tokenValue.fontSize = 9;
                tokenValue.fontName = { family: "Inter", style: "Regular" };
                tokenValue.fills = [{ type: 'SOLID', color: hexToRgb('#7F7F7F') }];

                tokenInfo.appendChild(tokenName);
                tokenInfo.appendChild(tokenValue);

                tokenCard.appendChild(previewFrame);
                tokenCard.appendChild(tokenInfo);
                tokenGrid.appendChild(tokenCard);
            }

            frame.appendChild(tokenGrid);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Stroke Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating stroke doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-shadow-styles") {
        try {
            // Define predefined shadow styles
            const shadows = [
                { name: 'shadow-xs', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.05 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-sm', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-base', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-md', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-lg', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 10 }, radius: 15, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-xl', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 20 }, radius: 25, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-2xl', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 25 }, radius: 50, spread: 0, visible: true, blendMode: 'NORMAL' } },
                { name: 'shadow-3xl', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 40 }, radius: 50, spread: 0, visible: true, blendMode: 'NORMAL' } }
            ];

            let createdCount = 0;

            for (const shadow of shadows) {
                // Check if style already exists
                let style = figma.getLocalEffectStyles().find(s => s.name === shadow.name);

                if (!style) {
                    style = figma.createEffectStyle();
                    style.name = shadow.name;
                }

                // Set the effect
                style.effects = [shadow.effect];
                createdCount++;
            }

            figma.notify(`Created ${createdCount} shadow styles successfully!`);
        } catch (error) {
            figma.notify('Error creating shadow styles: ' + error.message);
        }
    }

    if (msg.type === "create-shadow-doc") {
        try {
            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Define shadow styles (same as in create-shadow-styles)
            const shadows = [
                { name: 'shadow-xs', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.05 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 1, Blur: 2' },
                { name: 'shadow-sm', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 1, Blur: 3' },
                { name: 'shadow-base', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 2, Blur: 4' },
                { name: 'shadow-md', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 4, Blur: 6' },
                { name: 'shadow-lg', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 10 }, radius: 15, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 10, Blur: 15' },
                { name: 'shadow-xl', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 20 }, radius: 25, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 20, Blur: 25' },
                { name: 'shadow-2xl', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 25 }, radius: 50, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 25, Blur: 50' },
                { name: 'shadow-3xl', effect: { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 40 }, radius: 50, spread: 0, visible: true, blendMode: 'NORMAL' }, description: 'X: 0, Y: 40, Blur: 50' }
            ];

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Shadow";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Shadow";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Predefined shadow styles for consistent depth.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            const tokenGrid = figma.createFrame();
            tokenGrid.name = "Token Grid";
            tokenGrid.layoutMode = "HORIZONTAL";
            tokenGrid.primaryAxisSizingMode = "AUTO";
            tokenGrid.counterAxisSizingMode = "AUTO";
            tokenGrid.itemSpacing = 2;
            tokenGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            const gridBorderColor = hexToRgb('#D5D5D6');
            tokenGrid.strokes = [{ type: 'SOLID', color: gridBorderColor }];
            tokenGrid.strokeWeight = 1;
            tokenGrid.cornerRadius = 8;

            // Generate shadow token cards
            for (let i = 0; i < shadows.length; i++) {
                const shadow = shadows[i];

                const tokenCard = figma.createFrame();
                tokenCard.name = `${i}`;
                tokenCard.layoutMode = "VERTICAL";
                tokenCard.primaryAxisSizingMode = "AUTO";
                tokenCard.counterAxisSizingMode = "FIXED";
                tokenCard.resize(160, 156);
                tokenCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Preview Frame
                const previewFrame = figma.createFrame();
                previewFrame.name = "Preview Frame";
                previewFrame.layoutMode = "HORIZONTAL";
                previewFrame.primaryAxisSizingMode = "FIXED";
                previewFrame.counterAxisSizingMode = "FIXED";
                previewFrame.resize(160, 100);
                previewFrame.primaryAxisAlignItems = "CENTER";
                previewFrame.counterAxisAlignItems = "CENTER";
                previewFrame.paddingTop = 16;
                previewFrame.paddingBottom = 16;
                previewFrame.paddingLeft = 16;
                previewFrame.paddingRight = 16;
                previewFrame.fills = [{ type: 'SOLID', color: hexToRgb('#F5F5F5') }];

                // Create rectangle with shadow effect
                const shadowBox = figma.createFrame();
                shadowBox.name = "Shadow Box";
                shadowBox.resize(68, 68);
                shadowBox.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
                shadowBox.cornerRadius = 8;
                shadowBox.effects = [shadow.effect];

                previewFrame.appendChild(shadowBox);

                // Token Info
                const tokenInfo = figma.createFrame();
                tokenInfo.name = "Token Info";
                tokenInfo.layoutMode = "VERTICAL";
                tokenInfo.primaryAxisSizingMode = "AUTO";
                tokenInfo.counterAxisSizingMode = "FIXED";
                tokenInfo.resize(160, 56);
                tokenInfo.itemSpacing = 6;
                tokenInfo.paddingTop = 12;
                tokenInfo.paddingBottom = 12;
                tokenInfo.paddingLeft = 12;
                tokenInfo.paddingRight = 12;
                tokenInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                // Token name
                const tokenName = figma.createText();
                tokenName.characters = shadow.name;
                tokenName.fontSize = 12;
                tokenName.fontName = { family: "Inter", style: "Medium" };
                tokenName.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                // Token value
                const tokenValue = figma.createText();
                tokenValue.characters = shadow.description;
                tokenValue.fontSize = 9;
                tokenValue.fontName = { family: "Inter", style: "Regular" };
                tokenValue.fills = [{ type: 'SOLID', color: hexToRgb('#7F7F7F') }];

                tokenInfo.appendChild(tokenName);
                tokenInfo.appendChild(tokenValue);

                tokenCard.appendChild(previewFrame);
                tokenCard.appendChild(tokenInfo);
                tokenGrid.appendChild(tokenCard);
            }

            frame.appendChild(tokenGrid);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Shadow Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating shadow doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-grid-styles") {
        try {
            const grids = msg.grids;

            // Desktop Grid Style
            let desktopStyle = figma.getLocalGridStyles().find(s => s.name === "Desktop Grid");
            if (!desktopStyle) {
                desktopStyle = figma.createGridStyle();
                desktopStyle.name = "Desktop Grid";
            }
            desktopStyle.layoutGrids = [
                {
                    pattern: 'COLUMNS',
                    alignment: 'STRETCH',
                    gutterSize: grids.desktop.gutter,
                    count: grids.desktop.columns,
                    offset: grids.desktop.margin,
                    visible: true,
                    color: { r: 1, g: 0, b: 0, a: 0.1 }
                }
            ];

            // Tablet Grid Style
            let tabletStyle = figma.getLocalGridStyles().find(s => s.name === "Tablet Grid");
            if (!tabletStyle) {
                tabletStyle = figma.createGridStyle();
                tabletStyle.name = "Tablet Grid";
            }
            tabletStyle.layoutGrids = [
                {
                    pattern: 'COLUMNS',
                    alignment: 'STRETCH',
                    gutterSize: grids.tablet.gutter,
                    count: grids.tablet.columns,
                    offset: grids.tablet.margin,
                    visible: true,
                    color: { r: 1, g: 0, b: 0, a: 0.1 }
                }
            ];

            // Mobile Grid Style
            let mobileStyle = figma.getLocalGridStyles().find(s => s.name === "Mobile Grid");
            if (!mobileStyle) {
                mobileStyle = figma.createGridStyle();
                mobileStyle.name = "Mobile Grid";
            }
            mobileStyle.layoutGrids = [
                {
                    pattern: 'COLUMNS',
                    alignment: 'STRETCH',
                    gutterSize: grids.mobile.gutter,
                    count: grids.mobile.columns,
                    offset: grids.mobile.margin,
                    visible: true,
                    color: { r: 1, g: 0, b: 0, a: 0.1 }
                }
            ];

            figma.notify('Created Desktop, Tablet, and Mobile grid styles successfully!');
        } catch (error) {
            figma.notify('Error creating grid styles: ' + error.message);
        }
    }

    if (msg.type === "create-grid-doc") {
        try {
            const grids = msg.grids;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Grid";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Grid";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Responsive grid layouts for Desktop, Tablet, and Mobile.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            const tokenGrid = figma.createFrame();
            tokenGrid.name = "Token Grid";
            tokenGrid.layoutMode = "VERTICAL";
            tokenGrid.primaryAxisSizingMode = "AUTO";
            tokenGrid.counterAxisSizingMode = "AUTO";
            tokenGrid.itemSpacing = 24;
            tokenGrid.fills = [];

            // Grid configurations
            const gridConfigs = [
                { name: 'Desktop Grid', width: 1920, height: 300, columns: grids.desktop.columns, margin: grids.desktop.margin, gutter: grids.desktop.gutter },
                { name: 'Tablet Grid', width: 800, height: 300, columns: grids.tablet.columns, margin: grids.tablet.margin, gutter: grids.tablet.gutter },
                { name: 'Mobile Grid', width: 342, height: 300, columns: grids.mobile.columns, margin: grids.mobile.margin, gutter: grids.mobile.gutter }
            ];

            // Generate grid cards
            for (const config of gridConfigs) {
                const gridCard = figma.createFrame();
                gridCard.name = config.name;
                gridCard.layoutMode = "VERTICAL";
                gridCard.primaryAxisSizingMode = "AUTO";
                gridCard.counterAxisSizingMode = "AUTO";
                gridCard.itemSpacing = 12;
                gridCard.fills = [];

                // Grid title
                const gridTitle = figma.createText();
                gridTitle.characters = config.name;
                gridTitle.fontSize = 18;
                gridTitle.fontName = { family: "Inter", style: "Bold" };
                gridTitle.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                gridCard.appendChild(gridTitle);

                // Grid preview container
                const gridPreviewContainer = figma.createFrame();
                gridPreviewContainer.name = "Grid Preview Container";
                gridPreviewContainer.layoutMode = "VERTICAL";
                gridPreviewContainer.primaryAxisSizingMode = "AUTO";
                gridPreviewContainer.counterAxisSizingMode = "AUTO";
                gridPreviewContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                gridPreviewContainer.strokes = [{ type: 'SOLID', color: hexToRgb('#D5D5D6') }];
                gridPreviewContainer.strokeWeight = 1;
                gridPreviewContainer.cornerRadius = 8;
                gridPreviewContainer.clipsContent = false;

                // Grid preview frame (scaled down to fit)
                const scale = Math.min(1200 / config.width, 1);
                const scaledWidth = config.width * scale;
                const scaledHeight = config.height * scale;

                const gridPreview = figma.createFrame();
                gridPreview.name = "Grid Preview";
                gridPreview.resize(scaledWidth, scaledHeight);
                gridPreview.fills = [{ type: 'SOLID', color: hexToRgb('#F5F5F5') }];

                // Calculate column width
                const totalMargin = config.margin * 2;
                const totalGutters = (config.columns - 1) * config.gutter;
                const availableWidth = config.width - totalMargin - totalGutters;
                const columnWidth = availableWidth / config.columns;

                // Create columns
                for (let i = 0; i < config.columns; i++) {
                    const column = figma.createFrame();
                    column.name = `Column ${i + 1}`;
                    const xPos = config.margin + (i * (columnWidth + config.gutter));
                    column.x = xPos * scale;
                    column.y = 0;
                    column.resize(columnWidth * scale, scaledHeight);
                    column.fills = [{ type: 'SOLID', color: hexToRgb('#1350FF'), opacity: 0.1 }];
                    column.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
                    column.strokeWeight = 1;
                    column.dashPattern = [4, 4];

                    gridPreview.appendChild(column);
                }

                gridPreviewContainer.appendChild(gridPreview);
                gridCard.appendChild(gridPreviewContainer);

                // Grid info
                const gridInfo = figma.createFrame();
                gridInfo.name = "Grid Info";
                gridInfo.layoutMode = "HORIZONTAL";
                gridInfo.primaryAxisSizingMode = "AUTO";
                gridInfo.counterAxisSizingMode = "AUTO";
                gridInfo.itemSpacing = 24;
                gridInfo.fills = [];

                const infoItems = [
                    { label: 'Columns', value: `${config.columns}` },
                    { label: 'Margin', value: `${config.margin}px` },
                    { label: 'Gutter', value: `${config.gutter}px` },
                    { label: 'Width', value: `${config.width}px` }
                ];

                for (const item of infoItems) {
                    const infoItem = figma.createFrame();
                    infoItem.name = item.label;
                    infoItem.layoutMode = "VERTICAL";
                    infoItem.primaryAxisSizingMode = "AUTO";
                    infoItem.counterAxisSizingMode = "AUTO";
                    infoItem.itemSpacing = 4;
                    infoItem.fills = [];

                    const label = figma.createText();
                    label.characters = item.label;
                    label.fontSize = 10;
                    label.fontName = { family: "Inter", style: "Regular" };
                    label.fills = [{ type: 'SOLID', color: hexToRgb('#7F7F7F') }];

                    const value = figma.createText();
                    value.characters = item.value;
                    value.fontSize = 12;
                    value.fontName = { family: "Inter", style: "Medium" };
                    value.fills = [{ type: 'SOLID', color: hexToRgb('#2D3339') }];

                    infoItem.appendChild(label);
                    infoItem.appendChild(value);
                    gridInfo.appendChild(infoItem);
                }

                gridCard.appendChild(gridInfo);
                tokenGrid.appendChild(gridCard);
            }

            frame.appendChild(tokenGrid);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Grid Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating grid doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-typography-styles") {
        try {
            const baseFontSize = msg.baseFontSize;
            const scale = msg.scale || 1.25; // Default scale if not provided
            const primaryFont = msg.primaryFont;

            const typographyLevels = [
                { name: 'H1', multiplier: Math.pow(scale, 5) },
                { name: 'H2', multiplier: Math.pow(scale, 4) },
                { name: 'H3', multiplier: Math.pow(scale, 3) },
                { name: 'H4', multiplier: Math.pow(scale, 2) },
                { name: 'H5', multiplier: scale },
                { name: 'H6', multiplier: 1 },
                { name: 'BODY1', multiplier: 1 },
                { name: 'BODY2', multiplier: 0.875 },
                { name: 'CAPTION', multiplier: 0.75 }
            ];

            let createdCount = 0;

            for (const level of typographyLevels) {
                const fontSize = Math.round(baseFontSize * level.multiplier);
                const styleName = `Typography/${level.name}`;

                // Check if style already exists
                let textStyle = figma.getLocalTextStyles().find(s => s.name === styleName);

                if (!textStyle) {
                    textStyle = figma.createTextStyle();
                    textStyle.name = styleName;
                }

                // Load font before setting it
                await figma.loadFontAsync({ family: primaryFont, style: "Regular" });

                // Set font properties
                textStyle.fontSize = fontSize;
                textStyle.fontName = { family: primaryFont, style: "Regular" };
                textStyle.lineHeight = { value: 150, unit: "PERCENT" };

                createdCount++;
            }

            figma.notify(`Created ${createdCount} typography styles successfully!`);
        } catch (error) {
            figma.notify('Error creating typography styles: ' + error.message);
        }
    }

    if (msg.type === "create-typography-doc") {
        try {
            const baseFontSize = msg.baseFontSize;
            const primaryFont = msg.primaryFont;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
            await figma.loadFontAsync({ family: "Roboto", style: "Bold" });
            await figma.loadFontAsync({ family: "Plus Jakarta Sans", style: "SemiBold" });
            await figma.loadFontAsync({ family: primaryFont, style: "Bold" });

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Use the same multipliers as the preview (based on 12px base font)
            const typographyLevels = [
                { name: 'H1', multiplier: 56 / 12, lineHeight: 1.2 },
                { name: 'H2', multiplier: 48 / 12, lineHeight: 1.2 },
                { name: 'H3', multiplier: 34 / 12, lineHeight: 1.3 },
                { name: 'H4', multiplier: 28 / 12, lineHeight: 1.4 },
                { name: 'H5', multiplier: 24 / 12, lineHeight: 1.5 },
                { name: 'H6', multiplier: 20 / 12, lineHeight: 1.5 },
                { name: 'B1', multiplier: 18 / 12, lineHeight: 1.6 },
                { name: 'B2', multiplier: 16 / 12, lineHeight: 1.6 },
                { name: 'B3', multiplier: 14 / 12, lineHeight: 1.5 },
                { name: 'B4', multiplier: 12 / 12, lineHeight: 1.5 }
            ];

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Token Typography";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Typography";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Typography is vital in interface design unreadable content quickly drives users away.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            // Typography cards container
            const typoContainer = figma.createFrame();
            typoContainer.name = "Typography Container";
            typoContainer.layoutMode = "VERTICAL";
            typoContainer.primaryAxisSizingMode = "AUTO";
            typoContainer.counterAxisSizingMode = "AUTO";
            typoContainer.itemSpacing = 24;
            typoContainer.fills = [];

            // Generate typography cards
            for (const level of typographyLevels) {
                // Calculate font size based on base font (same as preview)
                let fontSize = Math.round(baseFontSize * level.multiplier);

                // Round to nearest even number
                if (fontSize % 2 !== 0) {
                    fontSize = fontSize + 1;
                }

                const lineHeight = Math.round(fontSize * level.lineHeight);

                const typoCard = figma.createFrame();
                typoCard.name = `${level.name}-${fontSize}px`;
                typoCard.layoutMode = "VERTICAL";
                typoCard.primaryAxisSizingMode = "AUTO";
                typoCard.counterAxisSizingMode = "AUTO";
                typoCard.itemSpacing = 16;
                typoCard.paddingTop = 16;
                typoCard.paddingBottom = 16;
                typoCard.paddingLeft = 16;
                typoCard.paddingRight = 16;
                typoCard.fills = [{ type: 'SOLID', color: hexToRgb('#FAFAFA') }];
                typoCard.strokes = [{ type: 'SOLID', color: hexToRgb('#D5D5D6') }];
                typoCard.strokeWeight = 1;
                typoCard.cornerRadius = 14;

                // Label
                const label = figma.createText();
                label.characters = `HEADINGS/${level.name}-${fontSize}PX`;
                label.fontSize = 12;
                label.fontName = { family: "Plus Jakarta Sans", style: "SemiBold" };
                label.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
                label.lineHeight = { value: 15, unit: "PIXELS" };
                label.textCase = "UPPER";

                // Sample text
                const sampleText = figma.createText();
                sampleText.characters = "AaBbCc";
                sampleText.fontSize = fontSize;
                sampleText.fontName = { family: primaryFont, style: "Bold" };
                sampleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
                sampleText.lineHeight = { value: lineHeight, unit: "PIXELS" };

                // Info container
                const infoContainer = figma.createFrame();
                infoContainer.name = "Info";
                infoContainer.layoutMode = "HORIZONTAL";
                infoContainer.primaryAxisSizingMode = "FIXED";
                infoContainer.counterAxisSizingMode = "FIXED";
                infoContainer.resize(668, 14);
                infoContainer.itemSpacing = 28;
                infoContainer.fills = [];

                const infoItems = [
                    { label: `Font Family: ${primaryFont} Bold` },
                    { label: `Font Size: ${fontSize}px` },
                    { label: `Line Height: ${lineHeight}px` },
                    { label: `Letter Spacing: 0px` }
                ];

                for (const item of infoItems) {
                    const infoText = figma.createText();
                    infoText.characters = item.label;
                    infoText.fontSize = 12;
                    infoText.fontName = { family: "Roboto", style: "Bold" };
                    infoText.fills = [{ type: 'SOLID', color: hexToRgb('#5E5E5E') }];
                    infoText.lineHeight = { value: 14, unit: "PIXELS" };

                    infoContainer.appendChild(infoText);
                }

                typoCard.appendChild(label);
                typoCard.appendChild(sampleText);
                typoCard.appendChild(infoContainer);
                typoContainer.appendChild(typoCard);
            }

            frame.appendChild(typoContainer);

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.primaryAxisAlignItems = "MIN";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Typography Token Documentation created successfully!');
        } catch (error) {
            figma.notify('Error creating typography doc: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-typography-tokens") {
        try {
            const typographyData = msg.typographyData;
            const fontWeights = msg.fontWeights;
            const primaryFont = msg.primaryFont;

            // Get or create Typography collection
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Typography");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Typography");
            }

            const modeId = collection.modes[0].modeId;

            // Step 1: Create Font Family variable
            let fontFamilyVar = figma.variables.getLocalVariables().find(v => v.name === "font-family/primary");
            if (!fontFamilyVar) {
                fontFamilyVar = figma.variables.createVariable("font-family/primary", collection, "STRING");
            }
            fontFamilyVar.setValueForMode(modeId, primaryFont);
            fontFamilyVar.description = "Primary font family for typography system";

            // Step 2: Create Font Weight variables
            for (const weight of fontWeights) {
                const weightVarName = `font-weight/${weight.name.toLowerCase()}`;
                let weightVar = figma.variables.getLocalVariables().find(v => v.name === weightVarName);
                if (!weightVar) {
                    weightVar = figma.variables.createVariable(weightVarName, collection, "FLOAT");
                }
                weightVar.setValueForMode(modeId, weight.weight);
                weightVar.description = `Font weight value for ${weight.name} (${weight.weight})`;
            }

            // Step 3: Create Font Size, Line Height, and Letter Spacing varia
            // les for each level
            for (const typo of typographyData) {
                // Font Size
                const fontSizeVarName = `font-size/${typo.name.toLowerCase()}`;
                let fontSizeVar = figma.variables.getLocalVariables().find(v => v.name === fontSizeVarName);
                if (!fontSizeVar) {
                    fontSizeVar = figma.variables.createVariable(fontSizeVarName, collection, "FLOAT");
                }
                fontSizeVar.setValueForMode(modeId, typo.fontSize);
                fontSizeVar.description = `Font size for ${typo.name} (${typo.fontSize}px)`;

                // Line Height (in pixels, not percentage)
                const lineHeightVarName = `line-height/${typo.name.toLowerCase()}`;
                let lineHeightVar = figma.variables.getLocalVariables().find(v => v.name === lineHeightVarName);
                if (!lineHeightVar) {
                    lineHeightVar = figma.variables.createVariable(lineHeightVarName, collection, "FLOAT");
                }
                lineHeightVar.setValueForMode(modeId, typo.lineHeight);
                lineHeightVar.description = `Line height for ${typo.name} (${typo.lineHeight}px)`;

                // Letter Spacing
                const letterSpacingVarName = `letter-spacing/${typo.name.toLowerCase()}`;
                let letterSpacingVar = figma.variables.getLocalVariables().find(v => v.name === letterSpacingVarName);
                if (!letterSpacingVar) {
                    letterSpacingVar = figma.variables.createVariable(letterSpacingVarName, collection, "FLOAT");
                }
                letterSpacingVar.setValueForMode(modeId, typo.letterSpacing);
                letterSpacingVar.description = `Letter spacing for ${typo.name} (${typo.letterSpacing}px)`;
            }

            // Step 4: Create Text Styles for each typography level with all font weights
            let textStylesCreated = 0;

            // Font style mapping for different weights
            const fontStyleMap = {
                'Regular': ['Regular', 'Normal', 'Book', 'Roman'],
                'Medium': ['Medium', 'Regular'],
                'Semibold': ['SemiBold', 'Semibold', 'Semi Bold', 'Demi Bold', 'DemiBold', 'Medium'],
                'Bold': ['Bold', 'Heavy', 'Black']
            };

            for (const typo of typographyData) {
                // Get the variables for this typography level
                const fontSizeVar = figma.variables.getLocalVariables().find(v => v.name === `font-size/${typo.name.toLowerCase()}`);
                const lineHeightVar = figma.variables.getLocalVariables().find(v => v.name === `line-height/${typo.name.toLowerCase()}`);
                const letterSpacingVar = figma.variables.getLocalVariables().find(v => v.name === `letter-spacing/${typo.name.toLowerCase()}`);

                for (const weight of fontWeights) {
                    let fontLoaded = false;
                    let loadedStyle = weight.name;

                    // Try to load font with different style variations
                    const stylesToTry = fontStyleMap[weight.name] || [weight.name];

                    for (const style of stylesToTry) {
                        try {
                            await figma.loadFontAsync({ family: primaryFont, style: style });
                            loadedStyle = style;
                            fontLoaded = true;
                            break;
                        } catch (e) {
                            // Continue to next style
                            continue;
                        }
                    }

                    if (!fontLoaded) {
                        console.warn(`Could not load ${primaryFont} ${weight.name}, skipping...`);
                        continue;
                    }

                    // Create text style name like "H1-56px/Regular"
                    const styleName = `${typo.name}-${typo.fontSize}px/${weight.name}`;

                    let textStyle = figma.getLocalTextStyles().find(s => s.name === styleName);
                    if (!textStyle) {
                        textStyle = figma.createTextStyle();
                        textStyle.name = styleName;
                    }

                    // Set font properties using the loaded style
                    textStyle.fontName = { family: primaryFont, style: loadedStyle };

                    // Bind variables to text style properties
                    const fontFamilyVar = figma.variables.getLocalVariables().find(v => v.name === "font-family/primary");
                    const fontWeightVar = figma.variables.getLocalVariables().find(v => v.name === `font-weight/${weight.name.toLowerCase()}`);

                    if (fontFamilyVar) {
                        textStyle.setBoundVariable('fontFamily', fontFamilyVar);
                    }

                    if (fontWeightVar) {
                        textStyle.setBoundVariable('fontWeight', fontWeightVar);
                    }

                    if (fontSizeVar) {
                        textStyle.setBoundVariable('fontSize', fontSizeVar);
                    } else {
                        textStyle.fontSize = typo.fontSize;
                    }

                    if (lineHeightVar) {
                        textStyle.setBoundVariable('lineHeight', lineHeightVar);
                    } else {
                        textStyle.lineHeight = { value: typo.lineHeight, unit: "PIXELS" };
                    }

                    if (letterSpacingVar) {
                        textStyle.setBoundVariable('letterSpacing', letterSpacingVar);
                    } else {
                        textStyle.letterSpacing = { value: typo.letterSpacing, unit: "PIXELS" };
                    }

                    textStylesCreated++;
                }
            }

            figma.notify(`Created typography system: Font family & weight variables, ${typographyData.length * 3} property variables (size/line-height/spacing), and ${textStylesCreated} text styles with variable bindings!`);
        } catch (error) {
            figma.notify('Error creating typography tokens: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-color-style-guide") {
        try {
            const colors = msg.colors;
            const includeStatus = msg.includeStatus;
            const includeNeutral = msg.includeNeutral;

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Helper to calculate contrast ratio
            function getContrastRatio(hex) {
                const rgb = hexToRgb(hex);
                const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
                const whiteLuminance = 1;
                const blackLuminance = 0;

                const contrastWithWhite = (whiteLuminance + 0.05) / (luminance + 0.05);
                const contrastWithBlack = (luminance + 0.05) / (blackLuminance + 0.05);

                return {
                    white: contrastWithWhite.toFixed(1),
                    black: contrastWithBlack.toFixed(1)
                };
            }

            // Helper to convert hex to HSL
            function hexToHSL(hex) {
                const rgb = hexToRgb(hex);
                const r = rgb.r;
                const g = rgb.g;
                const b = rgb.b;

                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;

                if (max === min) {
                    h = s = 0;
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                        case g: h = ((b - r) / d + 2) / 6; break;
                        case b: h = ((r - g) / d + 4) / 6; break;
                    }
                }

                return {
                    h: Math.round(h * 360),
                    s: Math.round(s * 100),
                    l: Math.round(l * 100)
                };
            }

            // Create main frame
            const frame = figma.createFrame();
            frame.name = "Color Style Guide";
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            frame.paddingTop = 40;
            frame.paddingBottom = 40;
            frame.paddingLeft = 40;
            frame.paddingRight = 40;
            frame.layoutMode = "VERTICAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.itemSpacing = 40;

            // Add top border
            frame.strokes = [{ type: 'SOLID', color: hexToRgb('#1350FF') }];
            frame.strokeWeight = 8;
            frame.strokeAlign = "INSIDE";
            frame.strokeTopWeight = 8;
            frame.strokeBottomWeight = 0;
            frame.strokeLeftWeight = 0;
            frame.strokeRightWeight = 0;

            // Load fonts
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Poppins", style: "Medium" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Color System";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "A comprehensive color palette designed for accessibility and visual harmony.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            frame.appendChild(titleSection);

            // Create color sections for each color
            for (const color of colors) {
                const colorSection = figma.createFrame();
                colorSection.name = `${color.name} Section`;
                colorSection.layoutMode = "VERTICAL";
                colorSection.primaryAxisSizingMode = "AUTO";
                colorSection.counterAxisSizingMode = "AUTO";
                colorSection.itemSpacing = 12;
                colorSection.fills = [];

                // Section header
                const sectionHeader = figma.createFrame();
                sectionHeader.name = "Section Header";
                sectionHeader.resize(600, 59);
                sectionHeader.layoutMode = "VERTICAL";
                sectionHeader.primaryAxisSizingMode = "AUTO";
                sectionHeader.counterAxisSizingMode = "FIXED";
                sectionHeader.itemSpacing = 6;
                sectionHeader.fills = [];

                const colorTitle = figma.createText();
                colorTitle.characters = color.name;
                colorTitle.fontSize = 20;
                colorTitle.fontName = { family: "Poppins", style: "SemiBold" };
                colorTitle.fills = [{ type: 'SOLID', color: hexToRgb('#151515') }];

                const colorDesc = figma.createText();
                colorDesc.characters = "A carefully crafted color that enhances your design system";
                colorDesc.fontSize = 14;
                colorDesc.fontName = { family: "Montserrat", style: "Medium" };
                colorDesc.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
                colorDesc.resize(600, 23);

                sectionHeader.appendChild(colorTitle);
                sectionHeader.appendChild(colorDesc);
                colorSection.appendChild(sectionHeader);

                // Color grid
                const colorGrid = figma.createFrame();
                colorGrid.name = "Color Grid";
                colorGrid.layoutMode = "HORIZONTAL";
                colorGrid.primaryAxisSizingMode = "AUTO";
                colorGrid.counterAxisSizingMode = "AUTO";
                colorGrid.itemSpacing = 2;
                colorGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                colorGrid.strokes = [{ type: 'SOLID', color: hexToRgb('#D5D5D6') }];
                colorGrid.strokeWeight = 1;
                colorGrid.cornerRadius = 8;

                // Create shade cards
                const shadeCount = color.shades.length;
                for (let i = 0; i < shadeCount; i++) {
                    const shadeValue = Math.round((i + 1) * (1000 / shadeCount));
                    const shadeHex = color.shades[i];
                    const rgb = hexToRgb(shadeHex);
                    const hsl = hexToHSL(shadeHex);
                    const contrast = getContrastRatio(shadeHex);

                    const shadeCard = figma.createFrame();
                    shadeCard.name = `${color.name}-${shadeValue}`;
                    shadeCard.layoutMode = "VERTICAL";
                    shadeCard.primaryAxisSizingMode = "AUTO";
                    shadeCard.counterAxisSizingMode = "AUTO";
                    shadeCard.counterAxisAlignItems = "MIN";
                    shadeCard.fills = [];

                    // Color preview
                    const colorPreview = figma.createFrame();
                    colorPreview.name = "Color Preview";
                    colorPreview.resize(160, 100);
                    colorPreview.fills = [{ type: 'SOLID', color: rgb }];

                    // Color info section
                    const colorInfo = figma.createFrame();
                    colorInfo.name = "Color Info";
                    colorInfo.layoutMode = "VERTICAL";
                    colorInfo.primaryAxisSizingMode = "AUTO";
                    colorInfo.counterAxisSizingMode = "AUTO";
                    colorInfo.itemSpacing = 6;
                    colorInfo.paddingTop = 12;
                    colorInfo.paddingBottom = 12;
                    colorInfo.paddingLeft = 12;
                    colorInfo.paddingRight = 12;
                    colorInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                    // Shade name
                    const shadeName = figma.createText();
                    shadeName.characters = `${color.name}-${shadeValue}`;
                    shadeName.fontSize = 14;
                    shadeName.fontName = { family: "Poppins", style: "Medium" };
                    shadeName.fills = [{ type: 'SOLID', color: hexToRgb('#151515') }];

                    // Hex value
                    const hexText = figma.createText();
                    hexText.characters = shadeHex.toUpperCase();
                    hexText.fontSize = 10;
                    hexText.fontName = { family: "Montserrat", style: "Regular" };
                    hexText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                    // RGB value
                    const rgbText = figma.createText();
                    rgbText.characters = `RGB(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
                    rgbText.fontSize = 10;
                    rgbText.fontName = { family: "Montserrat", style: "Regular" };
                    rgbText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                    colorInfo.appendChild(shadeName);
                    colorInfo.appendChild(hexText);
                    colorInfo.appendChild(rgbText);

                    shadeCard.appendChild(colorPreview);
                    shadeCard.appendChild(colorInfo);
                    colorGrid.appendChild(shadeCard);
                }

                colorSection.appendChild(colorGrid);
                frame.appendChild(colorSection);
            }

            // Add Status Colors if toggle is on
            if (includeStatus) {
                const statusColors = {
                    'Success': ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B'],
                    'Warning': ['#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F'],
                    'Error': ['#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'],
                    'Info': ['#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A']
                };

                for (const [colorName, shades] of Object.entries(statusColors)) {
                    const colorSection = figma.createFrame();
                    colorSection.name = `${colorName} Section`;
                    colorSection.layoutMode = "VERTICAL";
                    colorSection.primaryAxisSizingMode = "AUTO";
                    colorSection.counterAxisSizingMode = "AUTO";
                    colorSection.itemSpacing = 12;
                    colorSection.fills = [];

                    // Section header
                    const sectionHeader = figma.createFrame();
                    sectionHeader.name = "Section Header";
                    sectionHeader.layoutMode = "VERTICAL";
                    sectionHeader.primaryAxisSizingMode = "AUTO";
                    sectionHeader.counterAxisSizingMode = "AUTO";
                    sectionHeader.itemSpacing = 6;
                    sectionHeader.fills = [];

                    const colorTitle = figma.createText();
                    colorTitle.characters = colorName;
                    colorTitle.fontSize = 20;
                    colorTitle.fontName = { family: "Poppins", style: "SemiBold" };
                    colorTitle.fills = [{ type: 'SOLID', color: hexToRgb('#151515') }];

                    const colorDesc = figma.createText();
                    colorDesc.characters = "Status color for feedback and notifications";
                    colorDesc.fontSize = 14;
                    colorDesc.fontName = { family: "Montserrat", style: "Medium" };
                    colorDesc.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                    sectionHeader.appendChild(colorTitle);
                    sectionHeader.appendChild(colorDesc);
                    colorSection.appendChild(sectionHeader);

                    // Color grid
                    const colorGrid = figma.createFrame();
                    colorGrid.name = "Color Grid";
                    colorGrid.layoutMode = "HORIZONTAL";
                    colorGrid.primaryAxisSizingMode = "AUTO";
                    colorGrid.counterAxisSizingMode = "AUTO";
                    colorGrid.itemSpacing = 2;
                    colorGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                    colorGrid.strokes = [{ type: 'SOLID', color: hexToRgb('#D5D5D6') }];
                    colorGrid.strokeWeight = 1;
                    colorGrid.cornerRadius = 8;

                    // Create shade cards
                    for (let i = 0; i < shades.length; i++) {
                        const shadeValue = (i + 1) * 100;
                        const shadeHex = shades[i];
                        const rgb = hexToRgb(shadeHex);

                        const shadeCard = figma.createFrame();
                        shadeCard.name = `${colorName}-${shadeValue}`;
                        shadeCard.layoutMode = "VERTICAL";
                        shadeCard.primaryAxisSizingMode = "AUTO";
                        shadeCard.counterAxisSizingMode = "AUTO";
                        shadeCard.fills = [];

                        // Color preview
                        const colorPreview = figma.createFrame();
                        colorPreview.name = "Color Preview";
                        colorPreview.resize(160, 100);
                        colorPreview.fills = [{ type: 'SOLID', color: rgb }];

                        // Color info section
                        const colorInfo = figma.createFrame();
                        colorInfo.name = "Color Info";
                        colorInfo.layoutMode = "VERTICAL";
                        colorInfo.primaryAxisSizingMode = "AUTO";
                        colorInfo.counterAxisSizingMode = "AUTO";
                        colorInfo.itemSpacing = 6;
                        colorInfo.paddingTop = 12;
                        colorInfo.paddingBottom = 12;
                        colorInfo.paddingLeft = 12;
                        colorInfo.paddingRight = 12;
                        colorInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                        // Shade name
                        const shadeName = figma.createText();
                        shadeName.characters = `${colorName}-${shadeValue}`;
                        shadeName.fontSize = 14;
                        shadeName.fontName = { family: "Poppins", style: "Medium" };
                        shadeName.fills = [{ type: 'SOLID', color: hexToRgb('#151515') }];

                        // Hex value
                        const hexText = figma.createText();
                        hexText.characters = shadeHex.toUpperCase();
                        hexText.fontSize = 10;
                        hexText.fontName = { family: "Montserrat", style: "Regular" };
                        hexText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                        // RGB value
                        const rgbText = figma.createText();
                        rgbText.characters = `RGB(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
                        rgbText.fontSize = 10;
                        rgbText.fontName = { family: "Montserrat", style: "Regular" };
                        rgbText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                        colorInfo.appendChild(shadeName);
                        colorInfo.appendChild(hexText);
                        colorInfo.appendChild(rgbText);

                        shadeCard.appendChild(colorPreview);
                        shadeCard.appendChild(colorInfo);
                        colorGrid.appendChild(shadeCard);
                    }

                    colorSection.appendChild(colorGrid);
                    frame.appendChild(colorSection);
                }
            }

            // Add Neutral Colors if toggle is on
            if (includeNeutral) {
                const neutralShades = [
                    '#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF',
                    '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'
                ];

                const colorSection = figma.createFrame();
                colorSection.name = "Neutral Section";
                colorSection.layoutMode = "VERTICAL";
                colorSection.primaryAxisSizingMode = "AUTO";
                colorSection.counterAxisSizingMode = "AUTO";
                colorSection.itemSpacing = 12;
                colorSection.fills = [];

                // Section header
                const sectionHeader = figma.createFrame();
                sectionHeader.name = "Section Header";
                sectionHeader.layoutMode = "VERTICAL";
                sectionHeader.primaryAxisSizingMode = "AUTO";
                sectionHeader.counterAxisSizingMode = "AUTO";
                sectionHeader.itemSpacing = 6;
                sectionHeader.fills = [];

                const colorTitle = figma.createText();
                colorTitle.characters = "Neutral";
                colorTitle.fontSize = 20;
                colorTitle.fontName = { family: "Poppins", style: "SemiBold" };
                colorTitle.fills = [{ type: 'SOLID', color: hexToRgb('#151515') }];

                const colorDesc = figma.createText();
                colorDesc.characters = "Neutral colors for backgrounds, borders, and text";
                colorDesc.fontSize = 14;
                colorDesc.fontName = { family: "Montserrat", style: "Medium" };
                colorDesc.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                sectionHeader.appendChild(colorTitle);
                sectionHeader.appendChild(colorDesc);
                colorSection.appendChild(sectionHeader);

                // Color grid
                const colorGrid = figma.createFrame();
                colorGrid.name = "Color Grid";
                colorGrid.layoutMode = "HORIZONTAL";
                colorGrid.primaryAxisSizingMode = "AUTO";
                colorGrid.counterAxisSizingMode = "AUTO";
                colorGrid.itemSpacing = 2;
                colorGrid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                colorGrid.strokes = [{ type: 'SOLID', color: hexToRgb('#D5D5D6') }];
                colorGrid.strokeWeight = 1;
                colorGrid.cornerRadius = 8;

                // Create shade cards
                for (let i = 0; i < neutralShades.length; i++) {
                    const shadeValue = (i + 1) * 100;
                    const shadeHex = neutralShades[i];
                    const rgb = hexToRgb(shadeHex);

                    const shadeCard = figma.createFrame();
                    shadeCard.name = `Neutral-${shadeValue}`;
                    shadeCard.layoutMode = "VERTICAL";
                    shadeCard.primaryAxisSizingMode = "AUTO";
                    shadeCard.counterAxisSizingMode = "AUTO";
                    shadeCard.counterAxisAlignItems = "MIN";
                    shadeCard.fills = [];

                    // Color preview
                    const colorPreview = figma.createFrame();
                    colorPreview.name = "Color Preview";
                    colorPreview.resize(160, 100);
                    colorPreview.fills = [{ type: 'SOLID', color: rgb }];

                    // Color info section
                    const colorInfo = figma.createFrame();
                    colorInfo.name = "Color Info";
                    colorInfo.layoutMode = "VERTICAL";
                    colorInfo.primaryAxisSizingMode = "AUTO";
                    colorInfo.counterAxisSizingMode = "AUTO";
                    colorInfo.itemSpacing = 6;
                    colorInfo.paddingTop = 12;
                    colorInfo.paddingBottom = 12;
                    colorInfo.paddingLeft = 12;
                    colorInfo.paddingRight = 12;
                    colorInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

                    // Shade name
                    const shadeName = figma.createText();
                    shadeName.characters = `Neutral-${shadeValue}`;
                    shadeName.fontSize = 14;
                    shadeName.fontName = { family: "Poppins", style: "Medium" };
                    shadeName.fills = [{ type: 'SOLID', color: hexToRgb('#151515') }];

                    // Hex value
                    const hexText = figma.createText();
                    hexText.characters = shadeHex.toUpperCase();
                    hexText.fontSize = 10;
                    hexText.fontName = { family: "Montserrat", style: "Regular" };
                    hexText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                    // RGB value
                    const rgbText = figma.createText();
                    rgbText.characters = `RGB(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
                    rgbText.fontSize = 10;
                    rgbText.fontName = { family: "Montserrat", style: "Regular" };
                    rgbText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];

                    colorInfo.appendChild(shadeName);
                    colorInfo.appendChild(hexText);
                    colorInfo.appendChild(rgbText);

                    shadeCard.appendChild(colorPreview);
                    shadeCard.appendChild(colorInfo);
                    colorGrid.appendChild(shadeCard);
                }

                colorSection.appendChild(colorGrid);
                frame.appendChild(colorSection);
            }

            // Add footer
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.resize(141, 42);
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "FIXED";
            footer.primaryAxisAlignItems = "CENTER";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            frame.appendChild(footer);

            // Select and zoom to the created frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.notify('Color Style Guide created successfully!');
        } catch (error) {
            figma.notify('Error creating color style guide: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-button-variables") {
        try {
            // Get or create a collection for button variables
            let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Button");
            if (!collection) {
                collection = figma.variables.createVariableCollection("Button");
            }

            // Get mode ID
            let modeId = collection.modes[0].modeId;

            // Helper function to convert hex to RGB
            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                    throw new Error(`Invalid hex color: ${hex}`);
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Helper function to darken a color
            function darkenColor(hex, percent) {
                const rgb = hexToRgb(hex);
                const factor = 1 - (percent / 100);
                const r = Math.round(rgb.r * 255 * factor);
                const g = Math.round(rgb.g * 255 * factor);
                const b = Math.round(rgb.b * 255 * factor);
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }

            // Helper function to lighten a color
            function lightenColor(hex, percent) {
                const rgb = hexToRgb(hex);
                const factor = percent / 100;
                const r = Math.round(rgb.r * 255 + (255 - rgb.r * 255) * factor);
                const g = Math.round(rgb.g * 255 + (255 - rgb.g * 255) * factor);
                const b = Math.round(rgb.b * 255 + (255 - rgb.b * 255) * factor);
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }

            // Define button types and states
            const buttonTypes = ['primary', 'secondary', 'destructive', 'ghost', 'line', 'link'];
            const buttonStates = ['default', 'hover', 'active', 'disabled'];
            const properties = ['bg', 'text', 'border', 'icon'];

            // Default color scheme (can be customized)
            const primaryColor = '#1350FF';
            const textColor = '#FFFFFF';
            const destructiveColor = '#FF0000';
            const neutralColor = '#000000';

            // Create variables for each button type, state, and property
            for (const type of buttonTypes) {
                for (const state of buttonStates) {
                    for (const property of properties) {
                        const variableName = `button/${type}/${state}/${property}`;

                        // Check if variable already exists
                        let variable = figma.variables.getLocalVariables().find(v =>
                            v.name === variableName && v.variableCollectionId === collection.id
                        );

                        if (!variable) {
                            variable = figma.variables.createVariable(variableName, collection, "COLOR");
                        }

                        // Determine color based on type, state, and property
                        let color;

                        if (type === 'primary') {
                            if (state === 'default') {
                                if (property === 'bg') color = primaryColor;
                                else if (property === 'text') color = textColor;
                                else if (property === 'border') color = darkenColor(primaryColor, 20);
                                else if (property === 'icon') color = textColor;
                            } else if (state === 'hover') {
                                if (property === 'bg') color = darkenColor(primaryColor, 10);
                                else if (property === 'text') color = textColor;
                                else if (property === 'border') color = darkenColor(primaryColor, 30);
                                else if (property === 'icon') color = textColor;
                            } else if (state === 'active') {
                                if (property === 'bg') color = darkenColor(primaryColor, 20);
                                else if (property === 'text') color = textColor;
                                else if (property === 'border') color = darkenColor(primaryColor, 30);
                                else if (property === 'icon') color = textColor;
                            } else if (state === 'disabled') {
                                if (property === 'bg') color = '#AAAAAA';
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#AAAAAA';
                                else if (property === 'icon') color = '#FFFFFF';
                            }
                        } else if (type === 'secondary') {
                            if (state === 'default') {
                                if (property === 'bg') color = lightenColor(primaryColor, 20);
                                else if (property === 'text') color = textColor;
                                else if (property === 'border') color = primaryColor;
                                else if (property === 'icon') color = textColor;
                            } else if (state === 'hover') {
                                if (property === 'bg') color = primaryColor;
                                else if (property === 'text') color = textColor;
                                else if (property === 'border') color = darkenColor(primaryColor, 20);
                                else if (property === 'icon') color = textColor;
                            } else if (state === 'active') {
                                if (property === 'bg') color = darkenColor(primaryColor, 10);
                                else if (property === 'text') color = textColor;
                                else if (property === 'border') color = darkenColor(primaryColor, 20);
                                else if (property === 'icon') color = textColor;
                            } else if (state === 'disabled') {
                                if (property === 'bg') color = '#AAAAAA';
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#AAAAAA';
                                else if (property === 'icon') color = '#FFFFFF';
                            }
                        } else if (type === 'destructive') {
                            if (state === 'default') {
                                if (property === 'bg') color = destructiveColor;
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#CC0000';
                                else if (property === 'icon') color = '#FFFFFF';
                            } else if (state === 'hover') {
                                if (property === 'bg') color = '#CC0000';
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#990000';
                                else if (property === 'icon') color = '#FFFFFF';
                            } else if (state === 'active') {
                                if (property === 'bg') color = '#990000';
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#990000';
                                else if (property === 'icon') color = '#FFFFFF';
                            } else if (state === 'disabled') {
                                if (property === 'bg') color = '#AAAAAA';
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#AAAAAA';
                                else if (property === 'icon') color = '#FFFFFF';
                            }
                        } else if (type === 'ghost') {
                            if (state === 'default') {
                                if (property === 'bg') color = '#FFFFFF'; // Transparent represented as white
                                else if (property === 'text') color = neutralColor;
                                else if (property === 'border') color = '#FFFFFF'; // No border
                                else if (property === 'icon') color = neutralColor;
                            } else if (state === 'hover') {
                                if (property === 'bg') color = '#E3E3E3';
                                else if (property === 'text') color = neutralColor;
                                else if (property === 'border') color = '#E3E3E3';
                                else if (property === 'icon') color = neutralColor;
                            } else if (state === 'active') {
                                if (property === 'bg') color = '#C6C6C6';
                                else if (property === 'text') color = neutralColor;
                                else if (property === 'border') color = '#C6C6C6';
                                else if (property === 'icon') color = neutralColor;
                            } else if (state === 'disabled') {
                                if (property === 'bg') color = '#FFFFFF';
                                else if (property === 'text') color = '#717171';
                                else if (property === 'border') color = '#FFFFFF';
                                else if (property === 'icon') color = '#717171';
                            }
                        } else if (type === 'line') {
                            if (state === 'default') {
                                if (property === 'bg') color = '#FFFFFF';
                                else if (property === 'text') color = primaryColor;
                                else if (property === 'border') color = primaryColor;
                                else if (property === 'icon') color = primaryColor;
                            } else if (state === 'hover') {
                                if (property === 'bg') color = lightenColor(primaryColor, 90);
                                else if (property === 'text') color = primaryColor;
                                else if (property === 'border') color = primaryColor;
                                else if (property === 'icon') color = primaryColor;
                            } else if (state === 'active') {
                                if (property === 'bg') color = lightenColor(primaryColor, 70);
                                else if (property === 'text') color = primaryColor;
                                else if (property === 'border') color = primaryColor;
                                else if (property === 'icon') color = primaryColor;
                            } else if (state === 'disabled') {
                                if (property === 'bg') color = '#AAAAAA';
                                else if (property === 'text') color = '#FFFFFF';
                                else if (property === 'border') color = '#AAAAAA';
                                else if (property === 'icon') color = '#FFFFFF';
                            }
                        } else if (type === 'link') {
                            if (state === 'default') {
                                if (property === 'bg') color = '#FFFFFF';
                                else if (property === 'text') color = primaryColor;
                                else if (property === 'border') color = '#FFFFFF';
                                else if (property === 'icon') color = primaryColor;
                            } else if (state === 'hover') {
                                if (property === 'bg') color = '#FFFFFF';
                                else if (property === 'text') color = darkenColor(primaryColor, 20);
                                else if (property === 'border') color = '#FFFFFF';
                                else if (property === 'icon') color = darkenColor(primaryColor, 20);
                            } else if (state === 'active') {
                                if (property === 'bg') color = '#FFFFFF';
                                else if (property === 'text') color = neutralColor;
                                else if (property === 'border') color = '#FFFFFF';
                                else if (property === 'icon') color = neutralColor;
                            } else if (state === 'disabled') {
                                if (property === 'bg') color = '#FFFFFF';
                                else if (property === 'text') color = '#8E8E8E';
                                else if (property === 'border') color = '#FFFFFF';
                                else if (property === 'icon') color = '#8E8E8E';
                            }
                        }

                        // Set the color value
                        const rgb = hexToRgb(color);
                        variable.setValueForMode(modeId, rgb);
                    }
                }
            }

            figma.notify(`Created button variables for all types and states!`);
        } catch (error) {
            figma.notify('Error creating button variables: ' + error.message);
            console.error(error);
        }
    }

    if (msg.type === "create-button-doc") {
        try {
            // Get user inputs
            const buttonText = msg.buttonText || 'Button';
            const userRadius = msg.radius || 24;
            const userPrimaryColor = msg.primaryColor || '#1350FF';
            const userTextColor = msg.textColor || '#FFFFFF';

            // First, create button variables
            try {
                // Get or create a collection for button variables
                let collection = figma.variables.getLocalVariableCollections().find(c => c.name === "Button");
                if (!collection) {
                    collection = figma.variables.createVariableCollection("Button");
                }

                // Get mode ID
                let modeId = collection.modes[0].modeId;

                // Helper function to convert hex to RGB for variables
                function hexToRgbVar(hex) {
                    hex = hex.replace('#', '');
                    if (hex.length === 3) {
                        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                    }
                    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                        throw new Error(`Invalid hex color: ${hex}`);
                    }
                    const r = parseInt(hex.substring(0, 2), 16) / 255;
                    const g = parseInt(hex.substring(2, 4), 16) / 255;
                    const b = parseInt(hex.substring(4, 6), 16) / 255;
                    return { r, g, b };
                }

                // Helper function to darken a color for variables
                function darkenColorVar(hex, percent) {
                    const rgb = hexToRgbVar(hex);
                    const factor = 1 - (percent / 100);
                    const r = Math.round(rgb.r * 255 * factor);
                    const g = Math.round(rgb.g * 255 * factor);
                    const b = Math.round(rgb.b * 255 * factor);
                    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                }

                // Helper function to lighten a color for variables
                function lightenColorVar(hex, percent) {
                    const rgb = hexToRgbVar(hex);
                    const factor = percent / 100;
                    const r = Math.round(rgb.r * 255 + (255 - rgb.r * 255) * factor);
                    const g = Math.round(rgb.g * 255 + (255 - rgb.g * 255) * factor);
                    const b = Math.round(rgb.b * 255 + (255 - rgb.b * 255) * factor);
                    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                }

                // Define button types and states
                const buttonTypes = ['primary', 'secondary', 'destructive', 'ghost', 'line', 'link'];
                const buttonStates = ['default', 'hover', 'active', 'disabled'];
                const properties = ['bg', 'text', 'border', 'icon'];

                // Default color scheme
                const primaryColor = userPrimaryColor;
                const textColor = userTextColor;
                const destructiveColor = '#FF0000';
                const neutralColor = '#000000';

                // Create variables for each button type, state, and property
                for (const type of buttonTypes) {
                    for (const state of buttonStates) {
                        for (const property of properties) {
                            const variableName = `button/${type}/${state}/${property}`;

                            // Check if variable already exists
                            let variable = figma.variables.getLocalVariables().find(v =>
                                v.name === variableName && v.variableCollectionId === collection.id
                            );

                            if (!variable) {
                                variable = figma.variables.createVariable(variableName, collection, "COLOR");
                            }

                            // Determine color based on type, state, and property
                            let color;

                            if (type === 'primary') {
                                if (state === 'default') {
                                    if (property === 'bg') color = primaryColor;
                                    else if (property === 'text') color = textColor;
                                    else if (property === 'border') color = darkenColorVar(primaryColor, 20);
                                    else if (property === 'icon') color = textColor;
                                } else if (state === 'hover') {
                                    if (property === 'bg') color = darkenColorVar(primaryColor, 10);
                                    else if (property === 'text') color = textColor;
                                    else if (property === 'border') color = darkenColorVar(primaryColor, 30);
                                    else if (property === 'icon') color = textColor;
                                } else if (state === 'active') {
                                    if (property === 'bg') color = darkenColorVar(primaryColor, 20);
                                    else if (property === 'text') color = textColor;
                                    else if (property === 'border') color = darkenColorVar(primaryColor, 30);
                                    else if (property === 'icon') color = textColor;
                                } else if (state === 'disabled') {
                                    if (property === 'bg') color = '#AAAAAA';
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#AAAAAA';
                                    else if (property === 'icon') color = '#FFFFFF';
                                }
                            } else if (type === 'secondary') {
                                if (state === 'default') {
                                    if (property === 'bg') color = lightenColorVar(primaryColor, 20);
                                    else if (property === 'text') color = textColor;
                                    else if (property === 'border') color = primaryColor;
                                    else if (property === 'icon') color = textColor;
                                } else if (state === 'hover') {
                                    if (property === 'bg') color = primaryColor;
                                    else if (property === 'text') color = textColor;
                                    else if (property === 'border') color = darkenColorVar(primaryColor, 20);
                                    else if (property === 'icon') color = textColor;
                                } else if (state === 'active') {
                                    if (property === 'bg') color = darkenColorVar(primaryColor, 10);
                                    else if (property === 'text') color = textColor;
                                    else if (property === 'border') color = darkenColorVar(primaryColor, 20);
                                    else if (property === 'icon') color = textColor;
                                } else if (state === 'disabled') {
                                    if (property === 'bg') color = '#AAAAAA';
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#AAAAAA';
                                    else if (property === 'icon') color = '#FFFFFF';
                                }
                            } else if (type === 'destructive') {
                                if (state === 'default') {
                                    if (property === 'bg') color = destructiveColor;
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#CC0000';
                                    else if (property === 'icon') color = '#FFFFFF';
                                } else if (state === 'hover') {
                                    if (property === 'bg') color = '#CC0000';
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#990000';
                                    else if (property === 'icon') color = '#FFFFFF';
                                } else if (state === 'active') {
                                    if (property === 'bg') color = '#990000';
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#990000';
                                    else if (property === 'icon') color = '#FFFFFF';
                                } else if (state === 'disabled') {
                                    if (property === 'bg') color = '#AAAAAA';
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#AAAAAA';
                                    else if (property === 'icon') color = '#FFFFFF';
                                }
                            } else if (type === 'ghost') {
                                if (state === 'default') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = neutralColor;
                                    else if (property === 'border') color = '#FFFFFF';
                                    else if (property === 'icon') color = neutralColor;
                                } else if (state === 'hover') {
                                    if (property === 'bg') color = '#E3E3E3';
                                    else if (property === 'text') color = neutralColor;
                                    else if (property === 'border') color = '#E3E3E3';
                                    else if (property === 'icon') color = neutralColor;
                                } else if (state === 'active') {
                                    if (property === 'bg') color = '#C6C6C6';
                                    else if (property === 'text') color = neutralColor;
                                    else if (property === 'border') color = '#C6C6C6';
                                    else if (property === 'icon') color = neutralColor;
                                } else if (state === 'disabled') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = '#717171';
                                    else if (property === 'border') color = '#FFFFFF';
                                    else if (property === 'icon') color = '#717171';
                                }
                            } else if (type === 'line') {
                                if (state === 'default') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = primaryColor;
                                    else if (property === 'border') color = primaryColor;
                                    else if (property === 'icon') color = primaryColor;
                                } else if (state === 'hover') {
                                    if (property === 'bg') color = lightenColorVar(primaryColor, 90);
                                    else if (property === 'text') color = primaryColor;
                                    else if (property === 'border') color = primaryColor;
                                    else if (property === 'icon') color = primaryColor;
                                } else if (state === 'active') {
                                    if (property === 'bg') color = lightenColorVar(primaryColor, 70);
                                    else if (property === 'text') color = primaryColor;
                                    else if (property === 'border') color = primaryColor;
                                    else if (property === 'icon') color = primaryColor;
                                } else if (state === 'disabled') {
                                    if (property === 'bg') color = '#AAAAAA';
                                    else if (property === 'text') color = '#FFFFFF';
                                    else if (property === 'border') color = '#AAAAAA';
                                    else if (property === 'icon') color = '#FFFFFF';
                                }
                            } else if (type === 'link') {
                                if (state === 'default') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = primaryColor;
                                    else if (property === 'border') color = '#FFFFFF';
                                    else if (property === 'icon') color = primaryColor;
                                } else if (state === 'hover') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = darkenColorVar(primaryColor, 20);
                                    else if (property === 'border') color = '#FFFFFF';
                                    else if (property === 'icon') color = darkenColorVar(primaryColor, 20);
                                } else if (state === 'active') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = neutralColor;
                                    else if (property === 'border') color = '#FFFFFF';
                                    else if (property === 'icon') color = neutralColor;
                                } else if (state === 'disabled') {
                                    if (property === 'bg') color = '#FFFFFF';
                                    else if (property === 'text') color = '#8E8E8E';
                                    else if (property === 'border') color = '#FFFFFF';
                                    else if (property === 'icon') color = '#8E8E8E';
                                }
                            }

                            // Set the color value
                            const rgb = hexToRgbVar(color);
                            variable.setValueForMode(modeId, rgb);
                        }
                    }
                }

                // Create padding variables for each size
                const paddingConfig = {
                    'sm': { vertical: 4, horizontal: 8 },
                    'md': { vertical: 6, horizontal: 16 },
                    'lg': { vertical: 10, horizontal: 20 }
                };

                for (const [sizeName, padding] of Object.entries(paddingConfig)) {
                    // Vertical padding
                    const vPaddingName = `button/padding/${sizeName}/vertical`;
                    let vPaddingVar = figma.variables.getLocalVariables().find(v =>
                        v.name === vPaddingName && v.variableCollectionId === collection.id
                    );
                    if (!vPaddingVar) {
                        vPaddingVar = figma.variables.createVariable(vPaddingName, collection, "FLOAT");
                    }
                    vPaddingVar.setValueForMode(modeId, padding.vertical);

                    // Horizontal padding
                    const hPaddingName = `button/padding/${sizeName}/horizontal`;
                    let hPaddingVar = figma.variables.getLocalVariables().find(v =>
                        v.name === hPaddingName && v.variableCollectionId === collection.id
                    );
                    if (!hPaddingVar) {
                        hPaddingVar = figma.variables.createVariable(hPaddingName, collection, "FLOAT");
                    }
                    hPaddingVar.setValueForMode(modeId, padding.horizontal);
                }

                // Create text style variables for each size
                const textConfig = {
                    'sm': { fontSize: 14, lineHeight: 21 },
                    'md': { fontSize: 16, lineHeight: 26 },
                    'lg': { fontSize: 18, lineHeight: 29 }
                };

                for (const [sizeName, textStyle] of Object.entries(textConfig)) {
                    // Font size
                    const fontSizeName = `button/text/${sizeName}/fontSize`;
                    let fontSizeVar = figma.variables.getLocalVariables().find(v =>
                        v.name === fontSizeName && v.variableCollectionId === collection.id
                    );
                    if (!fontSizeVar) {
                        fontSizeVar = figma.variables.createVariable(fontSizeName, collection, "FLOAT");
                    }
                    fontSizeVar.setValueForMode(modeId, textStyle.fontSize);

                    // Line height
                    const lineHeightName = `button/text/${sizeName}/lineHeight`;
                    let lineHeightVar = figma.variables.getLocalVariables().find(v =>
                        v.name === lineHeightName && v.variableCollectionId === collection.id
                    );
                    if (!lineHeightVar) {
                        lineHeightVar = figma.variables.createVariable(lineHeightName, collection, "FLOAT");
                    }
                    lineHeightVar.setValueForMode(modeId, textStyle.lineHeight);
                }

                // Create corner radius variable
                const radiusName = `button/cornerRadius`;
                let radiusVar = figma.variables.getLocalVariables().find(v =>
                    v.name === radiusName && v.variableCollectionId === collection.id
                );
                if (!radiusVar) {
                    radiusVar = figma.variables.createVariable(radiusName, collection, "FLOAT");
                }
                radiusVar.setValueForMode(modeId, userRadius);

                // Create gap variable (space between icon and text)
                const gapName = `button/gap`;
                let gapVar = figma.variables.getLocalVariables().find(v =>
                    v.name === gapName && v.variableCollectionId === collection.id
                );
                if (!gapVar) {
                    gapVar = figma.variables.createVariable(gapName, collection, "FLOAT");
                }
                gapVar.setValueForMode(modeId, 8);

            } catch (varError) {
                console.log('Error creating variables:', varError);
                // Continue with component creation even if variables fail
            }

            // Load fonts first
            await figma.loadFontAsync({ family: "Poppins", style: "SemiBold" });
            await figma.loadFontAsync({ family: "Montserrat", style: "Medium" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });
            await figma.loadFontAsync({ family: "Avenir", style: "Medium" });
            await figma.loadFontAsync({ family: "Avenir", style: "Heavy" });

            // Create text styles for each button size
            const textStylesMap = {};
            const textStyleConfig = {
                'sm': { fontSize: 14, lineHeight: 1.4, fontWeight: 'Medium' },
                'md': { fontSize: 16, lineHeight: 1.5, fontWeight: 'Medium' },
                'lg': { fontSize: 18, lineHeight: 1.5, fontWeight: 'Heavy' }
            };

            for (const [sizeName, config] of Object.entries(textStyleConfig)) {
                const styleName = `Button/${sizeName.toUpperCase()}`;

                // Check if text style already exists
                let textStyle = figma.getLocalTextStyles().find(s => s.name === styleName);

                if (!textStyle) {
                    textStyle = figma.createTextStyle();
                    textStyle.name = styleName;
                }

                // Set text style properties
                textStyle.fontName = { family: "Avenir", style: config.fontWeight };
                textStyle.fontSize = config.fontSize;
                // Calculate line height in pixels (fontSize * lineHeight multiplier)
                const lineHeightPx = config.fontSize * config.lineHeight;
                textStyle.lineHeight = { value: lineHeightPx, unit: "PIXELS" };

                // Bind text style properties to variables if collection exists
                try {
                    const buttonCollection = figma.variables.getLocalVariableCollections().find(c => c.name === "Button");
                    if (buttonCollection) {
                        const allVariables = figma.variables.getLocalVariables();

                        // Bind font size
                        const fontSizeVar = allVariables.find(v =>
                            v.name === `button/text/${sizeName}/fontSize` &&
                            v.variableCollectionId === buttonCollection.id
                        );
                        if (fontSizeVar) {
                            textStyle.setBoundVariable('fontSize', fontSizeVar);
                        }

                        // Bind line height
                        const lineHeightVar = allVariables.find(v =>
                            v.name === `button/text/${sizeName}/lineHeight` &&
                            v.variableCollectionId === buttonCollection.id
                        );
                        if (lineHeightVar) {
                            textStyle.setBoundVariable('lineHeight', lineHeightVar);
                        }
                    }
                } catch (e) {
                    console.log('Could not bind text style variables:', e);
                }

                textStylesMap[sizeName] = textStyle;
            }

            function hexToRgb(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return { r, g, b };
            }

            // Helper function to darken a color
            function darkenColor(hex, percent) {
                const rgb = hexToRgb(hex);
                const factor = 1 - (percent / 100);
                const r = Math.round(rgb.r * 255 * factor);
                const g = Math.round(rgb.g * 255 * factor);
                const b = Math.round(rgb.b * 255 * factor);
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }

            // Helper function to lighten a color
            function lightenColor(hex, percent) {
                const rgb = hexToRgb(hex);
                const factor = percent / 100;
                const r = Math.round(rgb.r * 255 + (255 - rgb.r * 255) * factor);
                const g = Math.round(rgb.g * 255 + (255 - rgb.g * 255) * factor);
                const b = Math.round(rgb.b * 255 + (255 - rgb.b * 255) * factor);
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }

            // Create shared icon components once (to be used for instance swap)
            // Left icon component
            const leftIconSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.8334 10.0003H4.16675M4.16675 10.0003L10.0001 15.8337M4.16675 10.0003L10.0001 4.16699" stroke="#000000" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            const leftIconNode = figma.createNodeFromSvg(leftIconSvg);
            const sharedLeftIconComponent = figma.createComponent();
            sharedLeftIconComponent.name = "arrow-left";
            sharedLeftIconComponent.resize(20, 20);
            sharedLeftIconComponent.appendChild(leftIconNode);
            sharedLeftIconComponent.x = -2000;
            sharedLeftIconComponent.y = -2000;

            // Right icon component
            const rightIconSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.16675 10.0003H15.8334M15.8334 10.0003L10.0001 4.16699M15.8334 10.0003L10.0001 15.8337" stroke="#000000" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            const rightIconNode = figma.createNodeFromSvg(rightIconSvg);
            const sharedRightIconComponent = figma.createComponent();
            sharedRightIconComponent.name = "arrow-right";
            sharedRightIconComponent.resize(20, 20);
            sharedRightIconComponent.appendChild(rightIconNode);
            sharedRightIconComponent.x = -2000;
            sharedRightIconComponent.y = -2000;

            // Create button component function
            function createButton(size, type, state, leftIconComp, rightIconComp, buttonCollection, textStylesMap) {
                const button = figma.createComponent();
                button.name = `Size=${size}, Type=${type}, State=${state}`;

                // Size configurations
                const sizeConfig = {
                    'SM': { padding: 4, hPadding: 8, fontSize: 14, fontWeight: 'Medium', height: 28, iconSize: 16, sizeName: 'sm' },
                    'MD': { padding: 6, hPadding: 16, fontSize: 16, fontWeight: 'Medium', height: 36, iconSize: 20, sizeName: 'md' },
                    'LG': { padding: 10, hPadding: 20, fontSize: 18, fontWeight: 'Heavy', height: 47, iconSize: 24, sizeName: 'lg' }
                };

                const config = sizeConfig[size];
                button.layoutMode = "HORIZONTAL";
                button.primaryAxisSizingMode = "AUTO";
                button.counterAxisSizingMode = "FIXED";
                button.counterAxisAlignItems = "CENTER";
                button.primaryAxisAlignItems = "CENTER";
                button.paddingTop = config.padding;
                button.paddingBottom = config.padding;
                button.paddingLeft = config.hPadding;
                button.paddingRight = config.hPadding;
                button.itemSpacing = 8;
                button.cornerRadius = userRadius;
                button.resize(button.width, config.height);

                // Bind padding variables if available
                if (buttonCollection) {
                    const allVariables = figma.variables.getLocalVariables();

                    // Bind vertical padding
                    const vPaddingVar = allVariables.find(v =>
                        v.name === `button/padding/${config.sizeName}/vertical` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    if (vPaddingVar) {
                        try {
                            button.paddingTop = 0;
                            button.paddingBottom = 0;
                            button.setBoundVariable('paddingTop', vPaddingVar);
                            button.setBoundVariable('paddingBottom', vPaddingVar);
                        } catch (e) {
                            console.log('Could not bind vertical padding:', e);
                        }
                    }

                    // Bind horizontal padding
                    const hPaddingVar = allVariables.find(v =>
                        v.name === `button/padding/${config.sizeName}/horizontal` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    if (hPaddingVar) {
                        try {
                            button.paddingLeft = 0;
                            button.paddingRight = 0;
                            button.setBoundVariable('paddingLeft', hPaddingVar);
                            button.setBoundVariable('paddingRight', hPaddingVar);
                        } catch (e) {
                            console.log('Could not bind horizontal padding:', e);
                        }
                    }

                    // Bind gap variable
                    const gapVar = allVariables.find(v =>
                        v.name === `button/gap` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    if (gapVar) {
                        try {
                            button.itemSpacing = 0;
                            button.setBoundVariable('itemSpacing', gapVar);
                        } catch (e) {
                            console.log('Could not bind gap:', e);
                        }
                    }

                    // Bind corner radius variable
                    const radiusVar = allVariables.find(v =>
                        v.name === `button/cornerRadius` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    if (radiusVar) {
                        try {
                            button.cornerRadius = 0;
                            button.setBoundVariable('cornerRadius', radiusVar);
                        } catch (e) {
                            console.log('Could not bind corner radius:', e);
                        }
                    }
                }

                // Map UI state names to variable state names
                const stateMap = {
                    'Normal': 'default',
                    'Hover': 'hover',
                    'Click': 'active',
                    'Disable': 'disabled'
                };

                // Map UI type names to variable type names
                const typeMap = {
                    'Primary': 'primary',
                    'Secondary': 'secondary',
                    'Destructive': 'destructive',
                    'Ghost': 'ghost',
                    'Line': 'line',
                    'Link': 'link'
                };

                const varType = typeMap[type];
                const varState = stateMap[state];

                // Get variables for this button type and state
                let bgVariable, textVariable, borderVariable, iconVariable;

                if (buttonCollection) {
                    const allVariables = figma.variables.getLocalVariables();
                    bgVariable = allVariables.find(v =>
                        v.name === `button/${varType}/${varState}/bg` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    textVariable = allVariables.find(v =>
                        v.name === `button/${varType}/${varState}/text` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    borderVariable = allVariables.find(v =>
                        v.name === `button/${varType}/${varState}/border` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                    iconVariable = allVariables.find(v =>
                        v.name === `button/${varType}/${varState}/icon` &&
                        v.variableCollectionId === buttonCollection.id
                    );
                }

                // Type and State styling using user colors
                let bgColor, borderColor, textColor, hasBorder = false, hasUnderline = false;

                if (type === 'Primary') {
                    if (state === 'Normal') { bgColor = userPrimaryColor; borderColor = darkenColor(userPrimaryColor, 20); hasBorder = true; textColor = userTextColor; }
                    else if (state === 'Hover') { bgColor = darkenColor(userPrimaryColor, 10); borderColor = darkenColor(userPrimaryColor, 30); hasBorder = true; textColor = userTextColor; }
                    else if (state === 'Click') { bgColor = darkenColor(userPrimaryColor, 20); borderColor = darkenColor(userPrimaryColor, 30); hasBorder = true; textColor = userTextColor; }
                    else if (state === 'Disable') { bgColor = '#AAAAAA'; borderColor = '#AAAAAA'; hasBorder = true; textColor = '#FFFFFF'; }
                } else if (type === 'Secondary') {
                    if (state === 'Normal') { bgColor = lightenColor(userPrimaryColor, 20); borderColor = userPrimaryColor; hasBorder = true; textColor = userTextColor; }
                    else if (state === 'Hover') { bgColor = userPrimaryColor; borderColor = darkenColor(userPrimaryColor, 20); hasBorder = true; textColor = userTextColor; }
                    else if (state === 'Click') { bgColor = darkenColor(userPrimaryColor, 10); borderColor = darkenColor(userPrimaryColor, 20); hasBorder = true; textColor = userTextColor; }
                    else if (state === 'Disable') { bgColor = '#AAAAAA'; borderColor = '#AAAAAA'; hasBorder = true; textColor = '#FFFFFF'; }
                } else if (type === 'Destructive') {
                    if (state === 'Normal') { bgColor = '#FF0000'; borderColor = '#CC0000'; hasBorder = true; textColor = '#FFFFFF'; }
                    else if (state === 'Hover') { bgColor = '#CC0000'; borderColor = '#990000'; hasBorder = true; textColor = '#FFFFFF'; }
                    else if (state === 'Click') { bgColor = '#990000'; borderColor = '#990000'; hasBorder = true; textColor = '#FFFFFF'; }
                    else if (state === 'Disable') { bgColor = '#AAAAAA'; borderColor = '#AAAAAA'; hasBorder = true; textColor = '#FFFFFF'; }
                } else if (type === 'Ghost') {
                    if (state === 'Normal') { bgColor = 'transparent'; textColor = '#000000'; }
                    else if (state === 'Hover') { bgColor = '#E3E3E3'; textColor = '#000000'; }
                    else if (state === 'Click') { bgColor = '#C6C6C6'; textColor = '#000000'; }
                    else if (state === 'Disable') { bgColor = 'transparent'; textColor = '#717171'; }
                } else if (type === 'Line') {
                    if (state === 'Normal') { bgColor = 'transparent'; borderColor = userPrimaryColor; hasBorder = true; textColor = userPrimaryColor; }
                    else if (state === 'Hover') { bgColor = `rgba(${Math.round(hexToRgb(userPrimaryColor).r * 255)}, ${Math.round(hexToRgb(userPrimaryColor).g * 255)}, ${Math.round(hexToRgb(userPrimaryColor).b * 255)}, 0.08)`; borderColor = userPrimaryColor; hasBorder = true; textColor = userPrimaryColor; }
                    else if (state === 'Click') { bgColor = lightenColor(userPrimaryColor, 70); borderColor = userPrimaryColor; hasBorder = true; textColor = userPrimaryColor; }
                    else if (state === 'Disable') { bgColor = '#AAAAAA'; borderColor = '#AAAAAA'; hasBorder = true; textColor = '#FFFFFF'; }
                } else if (type === 'Link') {
                    if (state === 'Normal') { bgColor = 'transparent'; textColor = userPrimaryColor; hasUnderline = true; }
                    else if (state === 'Hover') { bgColor = 'transparent'; textColor = darkenColor(userPrimaryColor, 20); hasUnderline = true; }
                    else if (state === 'Click') { bgColor = 'transparent'; textColor = '#000000'; hasUnderline = true; }
                    else if (state === 'Disable') { bgColor = 'transparent'; textColor = '#8E8E8E'; hasUnderline = true; }
                }

                // Set background with variable binding
                if (bgColor === 'transparent') {
                    button.fills = [];
                } else if (bgColor.startsWith('rgba')) {
                    const match = bgColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                    button.fills = [{ type: 'SOLID', color: { r: parseInt(match[1]) / 255, g: parseInt(match[2]) / 255, b: parseInt(match[3]) / 255 }, opacity: parseFloat(match[4]) }];
                } else {
                    button.fills = [{ type: 'SOLID', color: hexToRgb(bgColor) }];
                }

                // Bind background to variable if available
                if (bgVariable) {
                    try {
                        button.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: bgVariable.id } } }];
                    } catch (e) {
                        console.log('Could not bind bg variable:', e);
                    }
                }

                // Set border with variable binding
                if (hasBorder) {
                    button.strokes = [{ type: 'SOLID', color: hexToRgb(borderColor) }];
                    button.strokeWeight = 1;

                    // Bind border to variable if available
                    if (borderVariable) {
                        try {
                            button.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: borderVariable.id } } }];
                        } catch (e) {
                            console.log('Could not bind border variable:', e);
                        }
                    }
                }

                // Create left icon instance from shared component
                const leftIcon = leftIconComp.createInstance();
                leftIcon.name = "Left Icon";

                // Scale the icon properly based on size
                const iconScale = config.iconSize / 20; // 20 is the base icon size
                leftIcon.rescale(iconScale);
                leftIcon.visible = true; // Make visible by default to see them

                // Set icon color (icons use strokes, not fills)
                try {
                    // Find all vector nodes in the icon and set their stroke color
                    const vectors = leftIcon.findAll(node => node.type === 'VECTOR');
                    vectors.forEach(vector => {
                        if (vector.strokes && vector.strokes.length > 0) {
                            vector.strokes = [{ type: 'SOLID', color: hexToRgb(textColor) }];

                            // Bind icon stroke color to variable if available
                            if (iconVariable) {
                                try {
                                    vector.strokes = [{
                                        type: 'SOLID',
                                        color: { r: 0, g: 0, b: 0 },
                                        boundVariables: {
                                            color: {
                                                type: 'VARIABLE_ALIAS',
                                                id: iconVariable.id
                                            }
                                        }
                                    }];
                                } catch (e) {
                                    console.log('Could not bind left icon stroke variable:', e);
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.log('Could not set left icon color:', e);
                }

                // Add text
                const text = figma.createText();
                text.name = "Button Text";
                text.characters = buttonText;
                // Apply text style first
                if (textStylesMap && textStylesMap[config.sizeName]) {
                    text.textStyleId = textStylesMap[config.sizeName].id;
                } else {
                    text.fontSize = config.fontSize;
                    text.fontName = { family: "Avenir", style: config.fontWeight };
                    text.lineHeight = { value: size === 'SM' ? 140 : 150, unit: "PERCENT" };
                }

                text.fills = [{ type: 'SOLID', color: hexToRgb(textColor) }];
                text.textDecoration = hasUnderline ? "UNDERLINE" : "NONE";

                // Bind text color to variable if available
                if (textVariable) {
                    try {
                        text.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: textVariable.id } } }];
                    } catch (e) {
                        console.log('Could not bind text variable:', e);
                    }
                }

                // Create right icon instance from shared component
                const rightIcon = rightIconComp.createInstance();
                rightIcon.name = "Right Icon";

                // Scale the icon properly based on size
                const iconScaleRight = config.iconSize / 20; // 20 is the base icon size
                rightIcon.rescale(iconScaleRight);
                rightIcon.visible = true; // Make visible by default to see them

                // Set icon color (icons use strokes, not fills)
                try {
                    // Find all vector nodes in the icon and set their stroke color
                    const vectors = rightIcon.findAll(node => node.type === 'VECTOR');
                    vectors.forEach(vector => {
                        if (vector.strokes && vector.strokes.length > 0) {
                            vector.strokes = [{ type: 'SOLID', color: hexToRgb(textColor) }];

                            // Bind icon stroke color to variable if available
                            if (iconVariable) {
                                try {
                                    vector.strokes = [{
                                        type: 'SOLID',
                                        color: { r: 0, g: 0, b: 0 },
                                        boundVariables: {
                                            color: {
                                                type: 'VARIABLE_ALIAS',
                                                id: iconVariable.id
                                            }
                                        }
                                    }];
                                } catch (e) {
                                    console.log('Could not bind right icon stroke variable:', e);
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.log('Could not set right icon color:', e);
                }

                // Add children to button in order
                button.appendChild(leftIcon);
                button.appendChild(text);
                button.appendChild(rightIcon);
                return button;
            }

            // Create component set
            const components = [];
            const sizes = ['SM', 'MD', 'LG'];
            const types = ['Primary', 'Destructive', 'Ghost', 'Line', 'Link'];
            const states = ['Normal', 'Hover', 'Click', 'Disable'];

            // Get the button collection for variable binding
            let buttonCollection = figma.variables.getLocalVariableCollections().find(c => c.name === "Button");

            for (const size of sizes) {
                for (const type of types) {
                    for (const state of states) {
                        components.push(createButton(size, type, state, sharedLeftIconComponent, sharedRightIconComponent, buttonCollection, textStylesMap));
                    }
                }
            }

            // Add all components to the page and position them in a grid layout
            // Layout: Group by TYPE first, showing all sizes for each type
            // 8 columns (4 states x 2 types), 9 rows (3 type-pairs x 3 sizes)
            const startX = 100;
            const startY = 100;
            const horizontalGap = 140; // Gap between buttons horizontally
            const verticalGap = 70; // Gap between rows
            const typeGroupGap = 30; // Extra gap between type groups

            // First, add all components to page and store in a map for easy access
            const componentMap = {};
            let componentIndex = 0;
            for (const size of sizes) {
                for (const type of types) {
                    for (const state of states) {
                        const component = components[componentIndex];
                        figma.currentPage.appendChild(component);
                        componentMap[`${size}-${type}-${state}`] = component;
                        componentIndex++;
                    }
                }
            }

            // Now position them: Single column layout with all types
            // Rows 0-2: Primary (SM, MD, LG)
            // Rows 3-5: Destructive (SM, MD, LG)
            // Rows 6-8: Ghost (SM, MD, LG)
            // Rows 9-11: Line (SM, MD, LG)
            // Rows 12-14: Link (SM, MD, LG)
            const typesList = ['Primary', 'Destructive', 'Ghost', 'Line', 'Link'];

            for (let typeIndex = 0; typeIndex < typesList.length; typeIndex++) {
                for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
                    const type = typesList[typeIndex];
                    const size = sizes[sizeIndex];

                    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
                        const state = states[stateIndex];
                        const component = componentMap[`${size}-${type}-${state}`];

                        // Row calculation: type index * 3 sizes + current size
                        const rowIndex = typeIndex * 3 + sizeIndex;

                        // Column calculation: just the state index (0-3)
                        const columnIndex = stateIndex;

                        // Add extra vertical spacing between type groups
                        let extraYOffset = typeIndex * typeGroupGap;

                        component.x = startX + (columnIndex * horizontalGap);
                        component.y = startY + (rowIndex * verticalGap) + extraYOffset;
                    }
                }
            }

            // Select all components and combine them as variants
            figma.currentPage.selection = components;

            // Use the correct API method
            let componentSet;
            if (typeof figma.combineAsVariants === 'function') {
                componentSet = figma.combineAsVariants(components, figma.currentPage);
            } else {
                // Fallback: just group them if combineAsVariants doesn't exist
                figma.notify('Creating component set manually. Please select all buttons and use "Create component set" from the menu.');
                componentSet = components[0]; // Use first component as reference
            }

            if (componentSet) {
                componentSet.name = "Button";

                // Add component properties
                try {
                    // First, get references to the icon instances from the first variant to use as defaults
                    const firstVariant = componentSet.children.find(child => child.type === "COMPONENT");
                    let leftIconInstance = null;
                    let rightIconInstance = null;

                    if (firstVariant) {
                        leftIconInstance = firstVariant.findOne(node => node.name === "Left Icon" && node.type === "INSTANCE");
                        rightIconInstance = firstVariant.findOne(node => node.name === "Right Icon" && node.type === "INSTANCE");

                        console.log("Left icon instance found:", leftIconInstance ? "yes" : "no");
                        console.log("Right icon instance found:", rightIconInstance ? "yes" : "no");
                        if (leftIconInstance) {
                            console.log("Left icon mainComponent:", leftIconInstance.mainComponent);
                        }
                        if (rightIconInstance) {
                            console.log("Right icon mainComponent:", rightIconInstance.mainComponent);
                        }
                    }

                    // Add instance properties to the component set
                    componentSet.addComponentProperty("Button Text", "TEXT", buttonText);
                    componentSet.addComponentProperty("Show Left Icon", "BOOLEAN", false);

                    // Only add instance swap if we found an instance to use as default
                    if (leftIconInstance && leftIconInstance.mainComponent) {
                        try {
                            componentSet.addComponentProperty("Left Icon", "INSTANCE_SWAP", leftIconInstance.mainComponent);
                            console.log("Added Left Icon instance swap property");
                        } catch (e) {
                            console.log("Could not add Left Icon instance swap:", e);
                        }
                    }

                    componentSet.addComponentProperty("Show Right Icon", "BOOLEAN", false);

                    // Only add instance swap if we found an instance to use as default
                    if (rightIconInstance && rightIconInstance.mainComponent) {
                        try {
                            componentSet.addComponentProperty("Right Icon", "INSTANCE_SWAP", rightIconInstance.mainComponent);
                            console.log("Added Right Icon instance swap property");
                        } catch (e) {
                            console.log("Could not add Right Icon instance swap:", e);
                        }
                    }

                    componentSet.addComponentProperty("Text", "BOOLEAN", true);

                    // Get the property IDs from the component set
                    const propDefs = componentSet.componentPropertyDefinitions;
                    let textPropId, showLeftIconPropId, leftIconPropId, showRightIconPropId, rightIconPropId, showTextPropId;

                    for (const [key, prop] of Object.entries(propDefs)) {
                        // Match by the property name we set
                        const propName = key.split('#')[0]; // Property names in Figma can have # suffix

                        if (propName === "Button Text") {
                            textPropId = key;
                        } else if (propName === "Show Left Icon") {
                            showLeftIconPropId = key;
                        } else if (propName === "Left Icon") {
                            leftIconPropId = key;
                        } else if (propName === "Show Right Icon") {
                            showRightIconPropId = key;
                        } else if (propName === "Right Icon") {
                            rightIconPropId = key;
                        } else if (propName === "Text") {
                            showTextPropId = key;
                        }
                    }

                    console.log("Property IDs:", { textPropId, showLeftIconPropId, leftIconPropId, showRightIconPropId, rightIconPropId, showTextPropId });

                    // Apply property bindings to each variant
                    componentSet.children.forEach(variant => {
                        if (variant.type === "COMPONENT") {
                            // Bind text layer to text property
                            const textLayer = variant.findOne(node => node.name === "Button Text");
                            if (textLayer && textLayer.type === "TEXT" && textPropId && showTextPropId) {
                                try {
                                    textLayer.componentPropertyReferences = {
                                        characters: textPropId,
                                        visible: showTextPropId
                                    };
                                    console.log("Bound text layer in variant:", variant.name);
                                } catch (e) {
                                    console.log("Could not bind text properties:", e);
                                }
                            }

                            // Bind left icon visibility and instance swap to property
                            const leftIconLayer = variant.findOne(node => node.name === "Left Icon");
                            if (leftIconLayer) {
                                try {
                                    const refs = {};
                                    if (showLeftIconPropId) {
                                        refs.visible = showLeftIconPropId;
                                    }
                                    if (leftIconPropId && leftIconLayer.type === "INSTANCE") {
                                        refs.mainComponent = leftIconPropId;
                                    }
                                    if (Object.keys(refs).length > 0) {
                                        leftIconLayer.componentPropertyReferences = refs;
                                        console.log("Bound left icon in variant:", variant.name);
                                    }
                                } catch (e) {
                                    console.log("Could not bind left icon:", e);
                                }
                            }

                            // Bind right icon visibility and instance swap to property
                            const rightIconLayer = variant.findOne(node => node.name === "Right Icon");
                            if (rightIconLayer) {
                                try {
                                    const refs = {};
                                    if (showRightIconPropId) {
                                        refs.visible = showRightIconPropId;
                                    }
                                    if (rightIconPropId && rightIconLayer.type === "INSTANCE") {
                                        refs.mainComponent = rightIconPropId;
                                    }
                                    if (Object.keys(refs).length > 0) {
                                        rightIconLayer.componentPropertyReferences = refs;
                                        console.log("Bound right icon in variant:", variant.name);
                                    }
                                } catch (e) {
                                    console.log("Could not bind right icon:", e);
                                }
                            }
                        }
                    });

                    figma.notify("Button component set created with properties!");
                } catch (error) {
                    console.log("Error adding component properties:", error);
                    figma.notify("Component created with some limitations: " + error.message);
                }
            }

            // Create documentation frame
            const docFrame = figma.createFrame();
            docFrame.name = "Button Component Set Documentation";
            docFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            docFrame.paddingTop = 40;
            docFrame.paddingBottom = 40;
            docFrame.paddingLeft = 40;
            docFrame.paddingRight = 40;
            docFrame.layoutMode = "VERTICAL";
            docFrame.primaryAxisSizingMode = "AUTO";
            docFrame.counterAxisSizingMode = "AUTO";
            docFrame.itemSpacing = 40;
            docFrame.x = 100;
            docFrame.y = 100;

            // Add top border
            const borderColor = hexToRgb('#1350FF');
            docFrame.strokes = [{ type: 'SOLID', color: borderColor }];
            docFrame.strokeWeight = 8;
            docFrame.strokeAlign = "INSIDE";
            docFrame.strokeTopWeight = 8;
            docFrame.strokeBottomWeight = 0;
            docFrame.strokeLeftWeight = 0;
            docFrame.strokeRightWeight = 0;

            // Title section
            const titleSection = figma.createFrame();
            titleSection.name = "Title Section";
            titleSection.layoutMode = "VERTICAL";
            titleSection.primaryAxisSizingMode = "AUTO";
            titleSection.counterAxisSizingMode = "AUTO";
            titleSection.itemSpacing = 34;
            titleSection.fills = [];

            // Create logo from SVG
            const logoSvg = `<svg width="224" height="32" viewBox="0 0 224 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_466_1736)"><g clip-path="url(#clip1_466_1736)"><path d="M47.9502 22.765C46.7073 22.0781 45.7261 21.1295 45.0065 19.952C44.2869 18.7418 43.9271 17.4008 43.9271 15.8962C43.9271 14.3916 44.2869 13.0506 45.0065 11.8404C45.7261 10.6302 46.7073 9.71438 47.9502 9.0275C49.1931 8.34063 50.5996 8.01355 52.1696 8.01355C53.4125 8.01355 54.59 8.24251 55.604 8.66771C56.6506 9.09292 57.5337 9.74708 58.2533 10.5648L56.4217 12.2983C55.3096 11.0881 53.9358 10.4994 52.3004 10.4994C51.2538 10.4994 50.3052 10.7283 49.4548 11.1862C48.6044 11.6442 47.9829 12.2983 47.4923 13.116C47.0344 13.9337 46.8054 14.8496 46.8054 15.8962C46.8054 16.9429 47.0344 17.8587 47.4923 18.6764C47.9502 19.4941 48.6044 20.1483 49.4548 20.6062C50.3052 21.0641 51.2211 21.2931 52.3004 21.2931C53.9358 21.2931 55.3096 20.6716 56.4217 19.4614L58.2533 21.2277C57.5337 22.0781 56.6506 22.6995 55.604 23.1247C54.5573 23.5499 53.4125 23.7789 52.1369 23.7789C50.5996 23.7789 49.1931 23.4191 47.9502 22.765Z" fill="black"/><path d="M63.6175 22.7649C62.3745 22.0781 61.3606 21.1295 60.641 19.9193C59.9214 18.7091 59.5616 17.3681 59.5616 15.8635C59.5616 14.3589 59.9214 13.0179 60.641 11.8077C61.3606 10.5975 62.3418 9.64895 63.6175 8.96207C64.8604 8.2752 66.2995 7.94812 67.8695 7.94812C69.4395 7.94812 70.846 8.2752 72.1216 8.96207C73.3645 9.64895 74.3785 10.5975 75.098 11.775C75.8176 12.9852 76.1774 14.3262 76.1774 15.8308C76.1774 17.3354 75.8176 18.6764 75.098 19.8866C74.3785 21.0968 73.3972 22.0126 72.1216 22.6995C70.8787 23.3864 69.4395 23.7135 67.8695 23.7135C66.2995 23.7789 64.8604 23.4191 63.6175 22.7649ZM70.617 20.5735C71.4347 20.1156 72.0889 19.4614 72.5468 18.6437C73.0047 17.826 73.2337 16.8775 73.2337 15.8635C73.2337 14.8496 73.0047 13.901 72.5468 13.0833C72.0889 12.2656 71.4347 11.6114 70.617 11.1535C69.7993 10.6956 68.8835 10.4667 67.8368 10.4667C66.8229 10.4667 65.8743 10.6956 65.0566 11.1535C64.2389 11.6114 63.5848 12.2656 63.1268 13.0833C62.6689 13.901 62.44 14.8496 62.44 15.8635C62.44 16.8775 62.6689 17.826 63.1268 18.6437C63.5848 19.4614 64.2389 20.1156 65.0566 20.5735C65.8743 21.0314 66.7902 21.2604 67.8368 21.2604C68.8835 21.2604 69.7993 21.0314 70.617 20.5735Z" fill="black"/><path d="M79.1539 8.17706H85.8591C87.4945 8.17706 88.9663 8.50414 90.242 9.1256C91.5176 9.74706 92.4988 10.6629 93.2184 11.8404C93.9053 13.0179 94.2651 14.3589 94.2651 15.8635C94.2651 17.4008 93.9053 18.7418 93.2184 19.8866C92.5315 21.0641 91.5176 21.9472 90.242 22.6014C88.9663 23.2228 87.5272 23.5499 85.8918 23.5499H79.1539V8.17706ZM85.7282 21.1295C86.8403 21.1295 87.8543 20.9006 88.7047 20.4753C89.5551 20.0501 90.2093 19.4287 90.6672 18.6437C91.1251 17.8587 91.354 16.9102 91.354 15.8635C91.354 14.8168 91.1251 13.8683 90.6672 13.0833C90.2093 12.2983 89.5551 11.6768 88.7047 11.2516C87.8543 10.8264 86.8403 10.5975 85.7282 10.5975H81.9995V21.1295H85.7282Z" fill="black"/><path d="M108.82 21.1622V23.5499H97.3069V8.17706H108.526V10.5648H100.153V14.5552H107.577V16.9102H100.153V21.1622H108.82Z" fill="black"/><path d="M115.133 10.5975H110.03V8.17706H123.081V10.5975H117.978V23.5499H115.133V10.5975Z" fill="black"/><path d="M138.879 8.17706V23.5499H136.033V16.9756H128.085V23.5499H125.24V8.17706H128.085V14.5225H136.033V8.17706H138.879Z" fill="black"/><path d="M154.514 21.1622V23.5499H143V8.17706H154.219V10.5648H145.846V14.5552H153.271V16.9102H145.846V21.1622H154.514Z" fill="black"/><path d="M160.597 22.7649C159.354 22.0781 158.34 21.1295 157.621 19.9193C156.901 18.7091 156.542 17.3681 156.542 15.8635C156.542 14.3589 156.901 13.0179 157.621 11.8077C158.34 10.5975 159.322 9.64895 160.597 8.96207C161.873 8.2752 163.279 7.94812 164.849 7.94812C166.419 7.94812 167.826 8.2752 169.101 8.96207C170.344 9.64895 171.358 10.5975 172.078 11.775C172.797 12.9852 173.157 14.3262 173.157 15.8308C173.157 17.3354 172.797 18.6764 172.078 19.8866C171.358 21.0968 170.377 22.0126 169.101 22.6995C167.859 23.3864 166.419 23.7135 164.849 23.7135C163.247 23.7789 161.84 23.4191 160.597 22.7649ZM167.597 20.5735C168.415 20.1156 169.069 19.4614 169.527 18.6437C169.985 17.826 170.214 16.8775 170.214 15.8635C170.214 14.8496 169.985 13.901 169.527 13.0833C169.069 12.2656 168.415 11.6114 167.597 11.1535C166.779 10.6956 165.863 10.4667 164.817 10.4667C163.803 10.4667 162.854 10.6956 162.036 11.1535C161.219 11.6114 160.565 12.2656 160.107 13.0833C159.649 13.901 159.42 14.8496 159.42 15.8635C159.42 16.8775 159.649 17.826 160.107 18.6437C160.565 19.4614 161.219 20.1156 162.036 20.5735C162.854 21.0314 163.77 21.2604 164.817 21.2604C165.863 21.2604 166.779 21.0314 167.597 20.5735Z" fill="black"/><path d="M186.175 23.5499L183.035 19.0362C182.904 19.0362 182.708 19.0689 182.446 19.0689H178.979V23.5499H176.134V8.17706H182.446C183.787 8.17706 184.932 8.40602 185.913 8.83123C186.895 9.25643 187.647 9.9106 188.17 10.7283C188.694 11.546 188.955 12.5273 188.955 13.6393C188.955 14.7841 188.661 15.7981 188.105 16.6158C187.549 17.4662 186.731 18.0877 185.685 18.4801L189.25 23.5499H186.175ZM185.161 11.3825C184.507 10.8591 183.558 10.5975 182.316 10.5975H178.979V16.7139H182.316C183.558 16.7139 184.507 16.4522 185.161 15.8962C185.815 15.3729 186.142 14.6206 186.142 13.6393C186.11 12.6581 185.815 11.9058 185.161 11.3825Z" fill="black"/><path d="M203.707 21.1622V23.5499H192.193V8.17706H203.412V10.5648H195.039V14.5552H202.464V16.9102H195.039V21.1622H203.707Z" fill="black"/><path d="M221.009 23.5499L220.977 13.3777L215.94 21.8164H214.664L209.627 13.5085V23.5499H206.912V8.17706H209.267L215.384 18.3493L221.336 8.17706H223.691L223.724 23.5499H221.009Z" fill="black"/><path d="M34.1474 24.5312H1.83165C0.327072 24.5312 -0.523342 22.8303 0.392488 21.6201L15.9943 1.01395C17.041 -0.359794 19.1016 -0.359794 20.1155 1.01395L35.6192 21.5874C36.5023 22.7976 35.6519 24.5312 34.1474 24.5312Z" fill="url(#paint0_linear_466_1736)"/><path d="M4.15395 28.5215L16.7466 11.9385C17.5643 10.8591 19.167 10.8918 19.952 11.9385L32.4465 28.5215C33.4278 29.8626 32.512 31.727 30.8438 31.727H5.75665C4.08853 31.727 3.14 29.8299 4.15395 28.5215Z" fill="url(#paint1_linear_466_1736)"/><path d="M29.4047 24.5312L19.952 11.9385C19.1343 10.8591 17.5643 10.8591 16.7466 11.9385L7.1958 24.5312H29.4047Z" fill="#6699FF"/></g></g><defs><linearGradient id="paint0_linear_466_1736" x1="0.0140991" y1="12.2574" x2="35.977" y2="12.2574" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><linearGradient id="paint1_linear_466_1736" x1="3.73645" y1="21.4341" x2="32.8498" y2="21.4341" gradientUnits="userSpaceOnUse"><stop stop-color="#3F71FF"/><stop offset="1" stop-color="#6A73FF"/></linearGradient><clipPath id="clip0_466_1736"><rect width="224" height="31.727" fill="white"/></clipPath><clipPath id="clip1_466_1736"><rect width="223.724" height="31.727" fill="white"/></clipPath></defs></svg>`;

            const logo = figma.createNodeFromSvg(logoSvg);
            logo.name = "logo - Horizontal";
            logo.resize(224, 31.73);

            // Header Section frame
            const headerSection = figma.createFrame();
            headerSection.name = "Header Section";
            headerSection.layoutMode = "VERTICAL";
            headerSection.primaryAxisSizingMode = "AUTO";
            headerSection.counterAxisSizingMode = "AUTO";
            headerSection.itemSpacing = 6;
            headerSection.fills = [];

            // Title text
            const titleText = figma.createText();
            titleText.characters = "Button Component Set";
            titleText.fontSize = 40;
            titleText.fontName = { family: "Poppins", style: "SemiBold" };
            titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            titleText.lineHeight = { value: 150, unit: "PERCENT" };

            // Subtitle text
            const subtitleText = figma.createText();
            subtitleText.characters = "Explore our diverse button set with different styles, sizes, and colors for your design.";
            subtitleText.fontSize = 16;
            subtitleText.fontName = { family: "Montserrat", style: "Medium" };
            subtitleText.fills = [{ type: 'SOLID', color: hexToRgb('#444445') }];
            subtitleText.lineHeight = { value: 160, unit: "PERCENT" };
            subtitleText.letterSpacing = { value: 0.032, unit: "PIXELS" };

            headerSection.appendChild(titleText);
            headerSection.appendChild(subtitleText);

            titleSection.appendChild(logo);
            titleSection.appendChild(headerSection);
            docFrame.appendChild(titleSection);

            // Create container for button component set
            const componentContainer = figma.createFrame();
            componentContainer.name = "Button Component Preview";
            componentContainer.layoutMode = "VERTICAL";
            componentContainer.primaryAxisSizingMode = "AUTO";
            componentContainer.counterAxisSizingMode = "AUTO";
            componentContainer.paddingTop = 84;
            componentContainer.paddingBottom = 84;
            componentContainer.paddingLeft = 84;
            componentContainer.paddingRight = 84;
            componentContainer.fills = [{ type: 'SOLID', color: hexToRgb('#FAFAFA') }];
            componentContainer.strokes = [{ type: 'SOLID', color: hexToRgb('#D5D5D6') }];
            componentContainer.strokeWeight = 1;
            componentContainer.cornerRadius = 8;

            // Move the component set inside the container
            if (componentSet && componentSet !== components[0]) {
                docFrame.appendChild(componentContainer);
                componentContainer.appendChild(componentSet);
            } else {
                // If component set wasn't created, add placeholder
                const placeholderText = figma.createText();
                placeholderText.characters = "Button components created. Please combine them manually into a component set.";
                placeholderText.fontSize = 16;
                placeholderText.fontName = { family: "Inter", style: "Regular" };
                placeholderText.fills = [{ type: 'SOLID', color: hexToRgb('#666666') }];
                componentContainer.appendChild(placeholderText);
                docFrame.appendChild(componentContainer);
            }

            // Footer section
            const footer = figma.createFrame();
            footer.name = "Footer Section";
            footer.layoutMode = "VERTICAL";
            footer.primaryAxisSizingMode = "AUTO";
            footer.counterAxisSizingMode = "AUTO";
            footer.itemSpacing = 8;
            footer.fills = [];

            const createdBy = figma.createText();
            createdBy.characters = "Created By";
            createdBy.fontSize = 12;
            createdBy.fontName = { family: "Inter", style: "Regular" };
            createdBy.fills = [{ type: 'SOLID', color: hexToRgb('#8A8A8A') }];
            createdBy.textAlignHorizontal = "CENTER";

            const website = figma.createText();
            website.characters = "Slate.Design.com";
            website.fontSize = 16;
            website.fontName = { family: "Inter", style: "Bold" };
            website.fills = [{ type: 'SOLID', color: hexToRgb('#121212') }];
            website.textAlignHorizontal = "CENTER";

            footer.appendChild(createdBy);
            footer.appendChild(website);
            docFrame.appendChild(footer);

            // Select created documentation frame
            figma.currentPage.selection = [docFrame];
            figma.viewport.scrollAndZoomIntoView([docFrame]);

            if (componentSet && componentSet !== components[0]) {
                figma.notify('Button Component Set with 72 variants created inside documentation frame!');
            } else {
                figma.notify('72 Button components created! Select all buttons and use "Create component set" from the menu to combine them.');
            }
        } catch (error) {
            figma.notify('Error creating button component: ' + error.message);
            console.error(error);
        }
    }
};
