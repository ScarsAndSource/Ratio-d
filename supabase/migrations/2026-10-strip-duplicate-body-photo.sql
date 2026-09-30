-- Removes the duplicate copy of each body photo that older app versions
-- embedded inside body_scans.metrics (the photo also lives in the dedicated
-- front_reference_image column, which is the copy the app reads).
--
-- ORDER MATTERS: deploy the new frontend FIRST, then run this. The new client
-- reads the photo from the column and tolerates rows with or without the
-- embedded copy, so this is safe to run at any time afterwards, and safe to
-- run more than once.
--
-- Safety: only strips rows where the dedicated column is populated, so no
-- photo is ever lost.

update public.body_scans
set metrics = metrics - 'frontReferenceImage'
where metrics ? 'frontReferenceImage'
  and front_reference_image is not null;
