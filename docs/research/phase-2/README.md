# Phase 2 research data

Verified inputs for the molecule explorer (spec section 6). Gathered on 2026-10-03; each file was produced by one pass and re-checked by a second, independent pass that re-fetched the sources and recomputed the derived values.

| File | Contents |
| --- | --- |
| `geometry.json` | Experimental gas-phase bond lengths, angles, and coordinates for the 13 Basics and VSEPR molecules, from NIST CCCBDB, with a citation per value. |
| `elements.json` | Data for the 11 elements used in v1 (atomic weight, electronegativity, configuration, ionization energies, radii, colour), with a source per value. |
| `expected.json` | The expected-values table (written from the research and checked by script and by a second reviewer): Lewis structure, formal charge, oxidation state, steric number, geometry, and hybridization for every atom of all 33 structures, plus molecular orbital data for O₂ and N₂. |
| `pubchem.json` | PubChem CIDs, record availability, and checks for all 33 structures. |
| `sdf/` | PubChem 3D and 2D structure files as downloaded. 3D exists for 29 of 33; BF₃, SF₆, XeF₄, and PCl₅ have 2D only. |
| `emission-lines.json` | Visible emission lines of hydrogen and xenon from the NIST Atomic Spectra Database (wavelengths in air, as NIST prints them), generated from the downloaded tables and re-checked against the cited pages. |
| `parse-sdf.mjs` | The V2000 molfile parser used to check the downloads. |
| `r3f-spike.md` | Findings from a throwaway React Three Fiber prototype of the 3D viewer. |

`geometry.json` and `elements.json` keep `valueAsPublished` beside each cited length, angle, dihedral, atomic weight and electronegativity: the text the source prints, re-read from the CCCBDB pages, the PubChem periodic table and the CIAAW table on 2026-10-03. The build copies it into the app's data as `published`, and the app shows it, so a printed trailing zero (PCl₅ 2.020 Å, H₂O₂ 0.950 Å, hydrogen 1.0080) is kept. PubChem prints the electronegativity of hydrogen as 2.2 and of xenon as 2.6. CCCBDB prints no angle rows for PCl₅, so its three angles have no published text.

## Conventions decided after this research

`expected.json` records the research as gathered. Two project decisions differ from it; the spec (sections 6.1 and 6.3) is the authority:

- **Oxygen hybridization.** The file marks O–H and ester oxygens next to a C=O as sp² (the organic chemistry description). The project follows general chemistry textbooks: those oxygens are sp³ and bent. Each such atom's `withoutResonanceOverride` block in the file holds the values the project uses. Nitrogen in amides and urea stays sp².
- **Terminal singly bonded atoms.** Halogens and singly bonded O⁻ show "not assigned (terminal atom)" for hybridization.

## Known limits

- Covalent radii (Cordero 2008), Bondi's van der Waals radii, and ionic radii (Shannon 1976) come from paywalled papers and were checked only against secondary transcriptions that agree with each other.
- The xenon electronegativity (2.6) has no traced primary source.
- PubChem 3D structures are computed conformers, not measurements.

PubChem data is provided by the National Library of Medicine (NCBI), which places no restrictions on its use and requests acknowledgment. It is not covered by this repository's MIT licence.
