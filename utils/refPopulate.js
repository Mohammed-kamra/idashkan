/**
 * Mongoose `.populate(..., select)` strings including multilingual
 * name/description fields for Store and Brand (used by data-language UI).
 */
const STORE_NAME_I18N = "name nameEn nameAr nameKu";
const BRAND_NAME_I18N = "name nameEn nameAr nameKu";
const COMPANY_NAME_I18N = "name nameEn nameAr nameKu";
const DESC_I18N = "description descriptionEn descriptionAr descriptionKu";

/** Category: `types` is included in full (embedded docs keep nameEn/… in DB). */
const CATEGORY_NAME_I18N = "name nameEn nameAr nameKu";
const categoryList = `${CATEGORY_NAME_I18N} types image icon`;
const categoryDetail = `${CATEGORY_NAME_I18N} types image icon ${DESC_I18N}`;

const storeList = `${STORE_NAME_I18N} logo storecity`;
const storeDetail = `${STORE_NAME_I18N} logo storecity address addressEn addressAr addressKu phone ${DESC_I18N}`;
const brandList = `${BRAND_NAME_I18N} logo statusAll`;
const brandDetail = `${BRAND_NAME_I18N} logo address addressEn addressAr addressKu phone ${DESC_I18N} statusAll`;
const companyList = `${COMPANY_NAME_I18N} logo statusAll`;
const companyDetail = `${COMPANY_NAME_I18N} logo address addressEn addressAr addressKu phone ${DESC_I18N} statusAll`;
/** Video/reel feed (keeps extra location fields some clients use) */
const storeVideo = `${STORE_NAME_I18N} logo storecity city`;
const brandVideo = `${BRAND_NAME_I18N} logo brandcity storecity city`;
const companyVideo = `${COMPANY_NAME_I18N} logo brandcity storecity city`;
/** Jobs: store linked + nested storeType */
const storeTypeList = "name nameEn nameAr nameKu icon";
const storeJob = `${STORE_NAME_I18N} logo storecity storeTypeId`;
const brandJob = `${BRAND_NAME_I18N} logo brandTypeId`;
const companyJob = `${COMPANY_NAME_I18N} logo brandTypeId`;

module.exports = {
  categoryList,
  categoryDetail,
  storeList,
  storeDetail,
  brandList,
  brandDetail,
  companyList,
  companyDetail,
  storeVideo,
  brandVideo,
  companyVideo,
  storeTypeList,
  storeJob,
  brandJob,
  companyJob,
};
