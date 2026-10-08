async function selectGeography(page, {province='CABA', zone, filial, locality}={}) {
  await page.locator('#province').selectOption(province);
  if(zone)await page.locator('#geographyZone').selectOption(zone);
  if(filial)await page.locator('#filial').selectOption(filial);
  if(locality)await page.locator('#locality').selectOption(locality);
}
module.exports={selectGeography};
