-- 제품 템플릿에 "컨텐츠 가이드" 컬럼 추가 (지침 위에 들어감)
alter table public.product_templates
  add column if not exists content_guide text;
