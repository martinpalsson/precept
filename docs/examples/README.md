# Rigr Example Requirements

This directory contains example requirements documentation demonstrating the Rigr format.

## Building HTML Documentation

```bash
# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r python-dependencies.txt

# Build HTML
make html

# Open: _build/html/index.html
```

## Structure

- **conf.py** - Configuration file defining object types and ID prefixes
- **requirements/** - Example RST files with requirements
  - **index.rst** - Main index and traceability matrices
  - **stakeholder.rst** - Stakeholder requirements (STKxxx)
  - **system.rst** - System requirements (SYSxxx)
  - **design.rst** - Design specifications and test cases (DSGxxx, TSTxxx)

## Format

All requirements use the unified `.. item::` directive with a `:type:` field:

```rst
.. item:: Title of the requirement
   :id: STK001
   :type: requirement
   :status: approved
   :priority: high
   
   Detailed description of the requirement.
```

### Object Types

- **requirement** - Requirements at any level (STK, SYS)
- **specification** - Technical design specifications (DSG)
- **parameter** - Test cases and parameters (TST)
- **rationale** - Justification and reasoning (RAT)
- **information** - Supporting information (INFO)

### ID Prefixes

- **STK** - Stakeholder requirements
- **SYS** - System requirements
- **DSG** - Design specifications
- **TST** - Test cases

## Note about Esbonio Errors

If you have the Esbonio (Sphinx language server) extension installed, you may see errors about:
- "Could not import extension rigr"
- Unknown directive types

**This is expected and normal.** Rigr is a standalone VS Code extension that provides its own requirements management capabilities. You don't need any additional Sphinx extensions installed to use Rigr. The example files are in RST format which works standalone.

To eliminate the errors, you can either:
1. Ignore them (they won't affect Rigr functionality)
2. Disable the Esbonio extension for this workspace
3. Install additional Sphinx extensions if you want to build Sphinx docs
