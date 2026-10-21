const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.TEST_BASE || 'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const regular=await browser.newContext({viewport:{width:1280,height:840}});
  const page=await regular.newPage();
  await page.goto(base);
  await page.locator('.tile').first().waitFor({timeout:20000});
  assert((await page.locator('.tile').count())>=12,'12 published banks should render');
  assert((await page.locator('footer').innerText()).includes('made by hayly <3'),'lowercase footer');
  for(const value of ['berry-bloom','midnight-sage','light','dark','contrast']){
   await page.locator('#themeSelect').selectOption(value);
   assert.equal(await page.locator('#themeSelect').inputValue(),value);
  }
  await page.locator('#themeSelect').selectOption('midnight-sage');
  await page.goto(base+'?bank=9&question=3');
  await page.locator('#choices .choice').first().waitFor({timeout:20000});
  assert.equal(await page.locator('#choices .choice').count(),5,'Bank 9 Q3 has five options');
  assert((await page.locator('#choices .choice').nth(1).innerText()).includes('Withhold apixaban without reversing it'),'new unseen question uses rewritten option');
  let font=await page.locator('#choices .choice').first().evaluate(el=>getComputedStyle(el).fontSize);
  assert.equal(font,'17px','desktop bank choices should be readable');
  await page.locator('#choices [data-choice="C"]').click();
  await page.locator('.learning-card:not(.learning-placeholder)').first().waitFor();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spaw.study.garden.online.v1')));
  assert.equal(state.banks['9']['3'].optionRevision,2,'new first attempt stores revised version');
  assert.equal(state.banks['9']['3'].choiceText, 'Stop apixaban, urgently reverse factor Xa activity and manage blood pressure.','stored text belongs to selected new option');
  await page.reload();
  await page.locator('#choices .choice').first().waitFor();
  assert((await page.locator('#choices .choice').nth(1).innerText()).includes('Withhold apixaban without reversing it'),'new attempt retains new option after reload');
  const legacy=await browser.newContext({viewport:{width:1280,height:840}});
  const old=await legacy.newPage();
  await old.goto(base);
  await old.evaluate(()=>{const d={format:'SPAW_ONLINE_PROGRESS_V1',version:1,banks:{9:{3:{choice:'B',correct:false,at:1}}},review:{},bookmarks:{},updated:Date.now()};localStorage.setItem('spaw.study.garden.online.v1',JSON.stringify(d))});
  await old.goto(base+'?bank=9&question=3');
  await old.locator('#choices .choice').first().waitFor({timeout:20000});
  assert((await old.locator('#choices .choice').nth(1).innerText()).includes('Withhold the next apixaban dose only'),'legacy attempt preserves original option wording');
  assert(await old.locator('.learning-legacy-notice').count()>0,'legacy notice visible');
  const after=await old.evaluate(()=>JSON.parse(localStorage.getItem('spaw.study.garden.online.v1')));
  assert.equal(after.banks['9']['3'].choice,'B','original answer preserved');
  assert.equal(after.banks['9']['3'].optionRevision,undefined,'no migration rewriting original answer');
  const mobile=await browser.newContext({viewport:{width:375,height:800}});
  const small=await mobile.newPage();
  await small.goto(base+'?bank=9&question=3');
  await small.locator('#choices .choice').first().waitFor({timeout:20000});
  font=await small.locator('#choices .choice').first().evaluate(el=>getComputedStyle(el).fontSize);
  assert.equal(font,'16px','mobile bank options should remain readable');
  for(const bank of [1,3,6,8,11,12]){
    await small.goto(base+'?bank='+bank);
    await small.locator('#choices .choice').first().waitFor({timeout:20000});
    assert((await small.locator('#choices .choice').count())>=4,'bank '+bank+' loads question options');
  }
  await regular.close();await legacy.close();await mobile.close();
  console.log('PASS: 12 banks, theme menu, options/readability, saved progress, legacy and revised attempts, mobile navigation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
