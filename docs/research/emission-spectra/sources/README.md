# Saved responses

What the NIST Atomic Spectra Database returned for each element on 2026-10-08, as it was returned. The emission spectra on the periodic table's element cards are built from these files and checked against them. `MANIFEST.json` lists every file with the element it is for, the query that returned it, and its full address.

The files are not edited by hand.

## Where they came from

Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database, Lines Data. National Institute of Standards and Technology. <https://doi.org/10.18434/T4W30F>. The lines form is at <https://physics.nist.gov/PhysRefData/ASD/lines_form.html>.

The requests were made on 2026-10-08, between 23:17 and 23:30 UTC, with `curl`, one at a time, with a pause of three seconds after each. Every response came back with HTTP status 200. The host publishes no `robots.txt` (the address returns 404).

## The two queries

**The neutral atom between 400 and 700 nm**, one request for each of the 118 elements. The files are `nist-asd-lines-<symbol>.txt`, or `.html` where NIST returned a page and not a table. `<symbol>` in the address is the element's symbol, and `I` after it names the spectrum of the neutral atom:

```
https://physics.nist.gov/cgi-bin/ASD/lines1.pl?spectra=<symbol>+I&limits_type=0&low_w=400&upp_w=700&unit=1&submit=Retrieve+Data&de=0&format=3&line_out=0&en_unit=0&output=0&page_size=15&show_obs_wl=1&unc_out=1&order_out=0&show_av=2&tsb_value=0&A_out=0&intens_out=on&allowed_out=1&forbid_out=1
```

It asks for wavelengths in nm from 400 to 700 (`low_w`, `upp_w`, `unit=1`), observed wavelengths and not calculated ones (`show_obs_wl=1`), in air in this range (`show_av=2`), with their uncertainty, the relative intensity (`intens_out=on`) and the transition probability (`A_out=0`), allowed and forbidden lines both, as tab-delimited text (`format=3`). The columns for the energy levels, configurations and terms were not asked for, which keeps the files small.

**Every line of the element**, one request for each of the 20 elements the first query returned no table for. The files are `nist-asd-all-lines-<symbol>.txt` or `.html`. The symbol alone asks for every stage of ionization, and there are no wavelength limits:

```
https://physics.nist.gov/cgi-bin/ASD/lines1.pl?spectra=<symbol>&limits_type=0&low_w=&upp_w=&unit=1&submit=Retrieve+Data&de=0&format=3&line_out=0&en_unit=0&output=0&page_size=15&show_obs_wl=1&unc_out=1&order_out=0&show_av=2&tsb_value=0&A_out=0&intens_out=on&allowed_out=1&forbid_out=1
```

## What a response looks like

A table (`.txt`, 100 files) has a heading row and one row for each classified line: `obs_wl_air(nm)`, `unc_obs_wl` (present in some tables and not in others), `intens`, `Aki(s^-1)`, `Acc` and `Type`. One observed line can have more than one row, where NIST classifies it as more than one transition. A table for every stage of ionization repeats its heading, with `element` and `sp_num` in front, once for the wavelengths in vacuum and once for those in air.

Where the database has no lines for a query it returns a web page (`.html`, 38 files) whose error message says that no lines are available with the parameters selected. The pages are kept whole, with NIST's navigation and the scripts its host adds, because that message is what the build reads.

| Response to the first query | Response to the second | Elements |
| --- | --- | --- |
| Table | not asked for | 98 |
| No-lines page | Table | 2: astatine, fermium |
| No-lines page | No-lines page | 18: mendelevium to oganesson |

## Read and not kept

`MANIFEST.json` lists one page under `readNotKept`: the help page of NIST's lines form. `../README.md` says what it was read for, and which sources of the flame test lab the note shown with every spectrum also rests on.
