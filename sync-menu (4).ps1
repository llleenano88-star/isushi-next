$ErrorActionPreference = "Stop"
$base = "https://api-ru.iiko.services"

$apiLogin = Read-Host "Вставьте apiLogin и нажмите Enter"
$t = (Invoke-RestMethod -Method Post -Uri "$base/api/1/access_token" -ContentType "application/json" -Body (@{ apiLogin = $apiLogin.Trim() } | ConvertTo-Json)).token
$h = @{ Authorization = "Bearer $t" }
$orgId = (Invoke-RestMethod -Method Post -Uri "$base/api/1/organizations" -Headers $h -ContentType "application/json" -Body '{}').organizations[0].id
$menuId = (Invoke-RestMethod -Method Post -Uri "$base/api/2/menu" -Headers $h -ContentType "application/json" -Body '{}').externalMenus[0].id
$body = @{ externalMenuId = $menuId; organizationIds = @($orgId) } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "$base/api/2/menu/by_id" -Headers $h -ContentType "application/json" -Body $body

# Разбор названия: "Австрия 6" -> base "Австрия", count 6;  "Абу-Даби - 6 - Запеченный" -> "Абу-Даби - Запеченный", 6
# Чистка названия после вырезания размера: лишние тире и пробелы, одиночные " - " становятся пробелом
function Clean-Name($s) {
  $s = ("$s" -replace '\s+', ' ').Trim()
  $s = $s -replace '\s*[-\u2013\u2014]{2,}\s*', ' '
  $s = $s -replace '(\s[-\u2013\u2014]){2,}', ' -'
  $s = $s -replace '^[\s\-\u2013\u2014]+|[\s\-\u2013\u2014]+$', ''
  $s = $s -replace '\s[-\u2013\u2014]\s', ' '
  $s = $s -replace '\sпо$', ''
  return ($s -replace '\s+', ' ').Trim()
}

# Ключ для склейки: без регистра, ё = е, типичные опечатки в iiko ("запеченый", "Манхетен")
function Norm-Key($s) {
  $k = "$s".ToLower() -replace 'ё', 'е'
  $k = $k -replace 'запеченый', 'запеченный' -replace 'манхетен', 'манхеттен'
  return ($k -replace '\s+', ' ').Trim()
}

# Размером считается отдельное число из списка типичных количеств штук (не внутри слова)
# "Австрия 8", "Австрия - 6 -", "Абу-Даби 8 запеченный", "Абу-Даби - 6 - Запеченный"
function Parse-Name($raw) {
  $name = ("$raw" -replace '\s+', ' ').Trim()
  $sizes = 4,5,6,8,9,10,12,16,18,20,24,30,32,36,40,48
  $ms = [regex]::Matches($name, '(?<![\p{L}\d])(\d{1,2})(?:\s*шт\.?)?(?![\p{L}\d])')
  $pick = $null
  foreach ($m in $ms) { if ($sizes -contains [int]$m.Groups[1].Value) { $pick = $m } }
  if ($null -eq $pick) { return @{ base = (Clean-Name $name); count = $null } }
  $rest = $name.Remove($pick.Index, $pick.Length)
  return @{ base = (Clean-Name $rest); count = [int]$pick.Groups[1].Value }
}
# Пицца: размер в сантиметрах (число 20-60, можно с "см"): "Пепперони 30", "Пепперони 30 см", "Пепперони - 30 см -"
function Parse-Pizza($raw) {
  $name = ("$raw" -replace '\s+', ' ').Trim()
  $ms = [regex]::Matches($name, '(?<![\p{L}\d.,])(\d{2})\s*(?:см|cm)?(?![\p{L}\d])', 'IgnoreCase')
  $pick = $null
  foreach ($m in $ms) { $n = [int]$m.Groups[1].Value; if ($n -ge 20 -and $n -le 60) { $pick = $m } }
  if ($null -eq $pick) { return @{ base = (Clean-Name $name); count = $null } }
  $rest = $name.Remove($pick.Index, $pick.Length)
  return @{ base = (Clean-Name $rest); count = [int]$pick.Groups[1].Value; unit = 'см' }
}
$esc = { param($s) "$s" -replace "'", "''" }

# Категории, где "Название 6" и "Название 8" склеиваются в один товар с вариантами. Остальные не склеиваются.
$groupCats = @('Роллы', 'сеты')

$groups = [ordered]@{}
$catIdx = 0
$cats = @()
foreach ($c in $r.itemCategories) {
  if (-not $c.items) { continue }
  $slug = "iiko-" + "$($c.id)".Substring(0, 8)
  $catName = $c.name.Substring(0, 1).ToUpper() + $c.name.Substring(1)
  $cats += "('$slug','$(& $esc $catName)',$catIdx)"
  $catIdx++
  foreach ($i in $c.items) {
    if ($i.isHidden) { continue }
    if ($groupCats -contains $c.name) {
      $p = Parse-Name $i.name
      $key = "$slug::" + (Norm-Key $p.base)
    } elseif ($c.name -match '(?i)пицц') {
      # категория пицц: каждый размер заведён отдельным блюдом, склеиваем по названию без размера
      $p = Parse-Pizza $i.name
      $key = "$slug::" + (Norm-Key $p.base)
    } else {
      # остальные категории (сеты, напитки и т.д.): без склейки, одно блюдо = один товар
      $p = @{ base = ("$($i.name)" -replace '\s+', ' ').Trim(); count = $null }
      $key = "$slug::" + $i.itemId
    }
    if (-not $groups.Contains($key)) {
      $groups[$key] = @{ slug = $slug; name = $p.base; desc = ""; variants = @(); minCnt = 999 }
    }
    $g = $groups[$key]
    if ($p.count -and $p.count -lt $g.minCnt) { $g.minCnt = $p.count; $g.name = $p.base }
    if (-not $g.desc -and $i.description) { $g.desc = $i.description }
    foreach ($s in $i.itemSizes) {
      $price = $s.prices[0].price
      if ($null -eq $price -or $price -le 0) { continue }
      if ($s.sizeName) { $label = $s.sizeName }
      elseif ($p.count) { if ($p.unit) { $u = $p.unit } else { $u = 'шт' }; $label = "$($p.count) $u" }
      elseif ($s.portionWeightGrams) { $label = "$([math]::Round($s.portionWeightGrams)) г" }
      else { $label = 'шт' }
      $g.variants += [pscustomobject]@{ label = $label; price = $price; sizeId = $s.sizeId; iiko_id = $i.itemId; cnt = [int]$p.count }
    }
  }
}

"--- Что получилось ---"
foreach ($g in $groups.Values) {
  $g.variants = @($g.variants | Sort-Object cnt, price)
  "$($g.name): " + (($g.variants | ForEach-Object { "$($_.label) - $($_.price)" }) -join ", ")
}
"Товаров: $($groups.Count)"

$prodRows = foreach ($g in $groups.Values) {
  if ($g.variants.Count -eq 0) { continue }
  $vj = ConvertTo-Json -Compress -InputObject @($g.variants | Select-Object label, price, sizeId, iiko_id)
  "('$($g.variants[0].iiko_id)','$($g.slug)','$(& $esc $g.name)','$(& $esc $g.desc)','$(& $esc $vj)')"
}
$keys = ($groups.Values | Where-Object { $_.variants.Count } | ForEach-Object { "'$($_.variants[0].iiko_id)'" }) -join ","

$sql = @"
insert into categories (slug, name, sort_order) values
$($cats -join ",`n")
on conflict (slug) do nothing;

insert into products (iiko_id, category_id, name, description, variants, updated_at)
select v.iiko_id, (select id from categories c where c.slug = v.slug), v.name, v.description, v.variants::jsonb, now()
from (values
$($prodRows -join ",`n")
) as v(iiko_id, slug, name, description, variants)
on conflict (iiko_id) do update set category_id = excluded.category_id, name = excluded.name,
  description = excluded.description, variants = excluded.variants, updated_at = now();

update products set is_available = false where iiko_id is not null and iiko_id not in ($keys);
"@
$sql | Out-File -Encoding utf8 menu.sql
$sql | Set-Clipboard
""
"SQL готов: он в буфере обмена и в файле menu.sql (папка, где запущен скрипт)."
