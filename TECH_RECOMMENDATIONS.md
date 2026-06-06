# Technical Recommendations & Future Improvements

**Document**: Future-Proofing & Optimization Roadmap  
**Audience**: Development Team  
**Priority**: Post-MVP iterations

---

## 1. Code Quality Improvements

### 1.1 Extract Risk Thresholds to Constants ⭐ HIGH PRIORITY

**Current State**: Risk thresholds (75, 50) hardcoded in multiple places
- `src/lib/hooks/useDashboardMetrics.ts` (lines 16-19)
- `src/lib/verifact-data.ts` (lines 45-60)
- `src/components/verifact/PatientTable.tsx` (filter logic)

**Recommended Fix**:

Create `src/lib/constants.ts`:
```typescript
export const RISK_THRESHOLDS = {
  HIGH_RISK: 75,
  MODERATE_RISK: 50,
  // Thresholds: score >= HIGH_RISK => "high"
  //             score >= MODERATE_RISK && < HIGH_RISK => "moderate"
  //             score < MODERATE_RISK => "low"
} as const;

export const RISK_LABELS = {
  high: "High Risk",
  moderate: "Needs Review",
  low: "Stable",
} as const;

export const RISK_COLORS = {
  high: { bg: "bg-red-50", text: "text-red-900", dot: "bg-red-500" },
  moderate: { bg: "bg-yellow-50", text: "text-yellow-900", dot: "bg-yellow-500" },
  low: { bg: "bg-green-50", text: "text-green-900", dot: "bg-green-500" },
} as const;
```

**Update Files**:
```bash
# Before
if (score >= 75) return "high";

# After
if (score >= RISK_THRESHOLDS.HIGH_RISK) return "high";
```

**Effort**: 1-2 hours  
**Benefit**: Single source of truth, easier maintenance, more testable

---

### 1.2 Add Unit Tests ⭐ HIGH PRIORITY

**Current State**: No test coverage

**Recommended Tests**:

```typescript
// src/lib/hooks/__tests__/useDashboardMetrics.test.ts
describe("useDashboardMetrics", () => {
  it("should calculate high risk count correctly", () => {
    const patients = [
      { riskScore: 92 },
      { riskScore: 88 },
      { riskScore: 52 },
    ];
    const metrics = calculateMetrics(patients);
    expect(metrics.highRisk).toBe(2);
    expect(metrics.needsReview).toBe(1);
  });

  it("should sort patients by risk DESC", () => {
    const unsorted = [{ id: 1, score: 52 }, { id: 2, score: 88 }];
    const sorted = sortByRiskDESC(unsorted);
    expect(sorted[0].score).toBe(88);
  });
});
```

**Framework**: Vitest (already in stack)  
**Coverage Target**: 80%+ for hooks, business logic  
**Effort**: 1 week  
**Benefit**: Confidence in refactoring, CI/CD integration

---

### 1.3 Implement Error Boundaries ⭐ MEDIUM PRIORITY

**Current State**: Error handling is manual, no React error boundaries

**Recommended Implementation**:

```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error("Error:", error, errorInfo);
    captureException(error);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// src/routes/__root.tsx
<ErrorBoundary>
  <Outlet />
</ErrorBoundary>
```

**Benefit**: Graceful error handling, user-friendly messages  
**Effort**: 2 hours

---

## 2. Architecture Improvements

### 2.1 Implement Doctor Authentication ⭐ HIGH PRIORITY

**Current State**: Hardcoded to first doctor (`.limit(1).maybeSingle()`)

**Problem**: 
- No multi-doctor support
- Security risk (assumes single user)
- No audit trail of doctor actions

**Recommended Solution**:

**Option A: Simple (MVP+)**
```typescript
// src/lib/hooks/useCurrentDoctor.ts
// Get doctor ID from URL param or context
const doctorId = useSearchParams()[0].get("doctorId") || "default";

const { data: doctor } = useQuery({
  queryKey: ["doctor", doctorId],
  queryFn: () => supabase
    .from("doctors")
    .select("*")
    .eq("id", doctorId)
    .single(),
});
```

**Option B: Proper Auth (Post-MVP)**
```typescript
// Use Supabase Auth
const { data: { session } } = await supabase.auth.getSession();
const doctorId = session?.user?.id;
```

**Effort**: Option A = 4 hours, Option B = 1 week  
**Benefit**: Multi-doctor support, audit trail, security

---

### 2.2 Add Caching Layer ⭐ MEDIUM PRIORITY

**Current State**: Fresh query on every component render

**Recommended**: Implement React Query caching

```typescript
// Already partially done but needs optimization
import { useQuery } from "@tanstack/react-query";

const { data: patients } = useQuery({
  queryKey: ["patients"],
  queryFn: () => fetchPatients(),
  staleTime: 30 * 1000, // 30s cache
  gcTime: 5 * 60 * 1000, // 5min garbage collect
});
```

**Benefit**: Reduced server load, faster navigation  
**Effort**: 2-3 hours

---

### 2.3 Implement Optimistic Updates ⭐ MEDIUM PRIORITY

**Current State**: Waits for server response before UI updates

**Recommended**:

```typescript
// src/lib/hooks/usePatients.ts
const mutation = useMutation({
  mutationFn: updatePatient,
  onMutate: async (newData) => {
    // Optimistically update UI
    queryClient.setQueryData(["patients"], (old) =>
      old.map(p => p.id === newData.id ? newData : p)
    );
  },
  onError: (err, newData, context) => {
    // Revert on error
    queryClient.setQueryData(["patients"], context.previous);
  },
});
```

**Benefit**: Snappier UI, better perceived performance  
**Effort**: 3-4 hours

---

## 3. Database & Performance

### 3.1 Add Missing Indexes ⭐ HIGH PRIORITY

**Current**: Only basic primary key indexes

**Recommended**:
```sql
-- Improve query performance
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);
CREATE INDEX idx_priority_scores_patient_id ON priority_scores(patient_id);
CREATE INDEX idx_triage_results_patient_created 
  ON triage_results(patient_id, created_at DESC);
CREATE INDEX idx_voice_notes_patient_id ON voice_notes(patient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

**Benefit**: 10-100x faster queries with large datasets  
**Effort**: 1 hour  
**Impact**: Required before production with real data

---

### 3.2 Partition Large Tables ⭐ LOW PRIORITY

**When**: Dataset grows beyond 1M rows

**Example**:
```sql
-- Partition triage_results by date
ALTER TABLE triage_results
PARTITION BY RANGE (DATE(created_at)) (
  PARTITION p_2025_01 VALUES LESS THAN ('2025-02-01'),
  PARTITION p_2025_02 VALUES LESS THAN ('2025-03-01'),
);
```

**Benefit**: Better query performance at scale  
**Timeline**: When data reaches 1M+ rows

---

### 3.3 Implement Data Retention Policies ⭐ MEDIUM PRIORITY

**Current**: All data stored indefinitely

**Recommended**:
```sql
-- Archive voice notes older than 1 year
DELETE FROM voice_notes 
WHERE created_at < NOW() - INTERVAL '1 year'
  AND archived_at IS NOT NULL;

-- Similar for audit logs, notifications
```

**Benefit**: Reduced storage costs, HIPAA compliance  
**Effort**: 2-3 hours

---

## 4. UI/UX Improvements

### 4.1 Implement Mobile Responsiveness ⭐ MEDIUM PRIORITY

**Current**: Optimized for desktop (drawer at 42vw)

**Issue**: Mobile users can't see drawer properly

**Recommended**:
```typescript
// Responsive drawer width
const drawerWidth = useMediaQuery("(max-width: 768px)") ? "100vw" : "42vw";

// Mobile sidebar → hamburger menu
// Mobile queue → swipe gesture to open drawer
```

**Effort**: 1 week  
**Benefit**: Works on tablets, mobile devices

---

### 4.2 Add Dark Mode ⭐ LOW PRIORITY

**Current**: Light theme only

**Recommended**: Use existing Tailwind dark: classes
```typescript
// src/routes/__root.tsx
const [theme, setTheme] = useState("light");

return (
  <div className={theme === "dark" ? "dark" : ""}>
    <Outlet />
  </div>
);
```

**Benefit**: Better for night shifts  
**Effort**: 4-6 hours

---

### 4.3 Add Keyboard Shortcuts ⭐ LOW PRIORITY

**Examples**:
```typescript
const shortcuts = {
  "cmd+n": () => openAddPatientDialog(),
  "cmd+k": () => focusSearch(),
  "cmd+a": () => openAlertsDrawer(),
  "escape": () => closeDrawer(),
};
```

**Benefit**: Power users love this  
**Effort**: 3-4 hours

---

## 5. Security & Compliance

### 5.1 Enable Row-Level Security Audit Logging ⭐ HIGH PRIORITY

**Current**: RLS policies in place but no audit trail

**Recommended**:
```sql
-- Log all RLS violations
CREATE TABLE rls_audit_log (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT,
  operation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger on RLS violation
CREATE TRIGGER rls_violation_trigger
AFTER UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION log_rls_violation();
```

**Benefit**: HIPAA compliance, security audits  
**Effort**: 2-3 hours

---

### 5.2 Implement Activity Logging ⭐ MEDIUM PRIORITY

**Track all patient data changes**:
```typescript
// When doctor views sensitive data
logActivity({
  doctorId: currentDoctor.id,
  patientId: patient.id,
  action: "VIEW_PATIENT",
  timestamp: new Date(),
  ip: req.ip,
});
```

**Benefit**: HIPAA compliance, audit trail  
**Effort**: 4-6 hours

---

### 5.3 Add HIPAA-Compliant Encryption ⭐ HIGH PRIORITY

**Current**: Relies on Supabase encryption (good start)

**Recommended**: Add field-level encryption
```typescript
// Encrypt sensitive fields
const encrypted = encryptPII({
  name: patient.name,
  phone: patient.phone,
  conditions: patient.conditions,
});
```

**Benefit**: Defense in depth  
**Effort**: 1 week (complex topic)

---

## 6. Analytics & Monitoring

### 6.1 Implement Error Tracking ⭐ MEDIUM PRIORITY

**Current**: Console logs only

**Recommended**: Integrate Sentry
```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

**Benefit**: Catch production errors, track trends  
**Effort**: 3-4 hours

---

### 6.2 Add Performance Monitoring ⭐ MEDIUM PRIORITY

```typescript
// Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
// etc.
```

**Benefit**: Know when app is slow  
**Effort**: 2 hours

---

### 6.3 Implement Analytics Dashboard ⭐ LOW PRIORITY

**Track**:
- Daily active doctors
- Patients reviewed per doctor
- Average time spent in drawer
- Search patterns
- Feature usage

**Benefit**: Product insights  
**Timeline**: Post-MVP

---

## 7. DevOps & Deployment

### 7.1 Set Up CI/CD Pipeline ⭐ MEDIUM PRIORITY

**Current**: Manual deployments

**Recommended**: GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

**Benefit**: Automated testing, safe deployments  
**Effort**: 4-6 hours

---

### 7.2 Set Up Environment-Specific Configs ⭐ HIGH PRIORITY

**Current**: Single Supabase project

**Recommended**: Dev/Staging/Prod separation
```
.env.development → Local Supabase
.env.staging → Staging Supabase  
.env.production → Production Supabase
```

**Benefit**: Safe testing, production isolation  
**Effort**: 2-3 hours

---

### 7.3 Implement Rollback Strategy ⭐ MEDIUM PRIORITY

**Recommended**: Supabase migrations + GitHub tags
```bash
# Tag releases
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Rollback if needed
git checkout v0.9.5
npm run deploy:rollback
```

**Benefit**: Easy version control  
**Effort**: 3-4 hours

---

## Priority Matrix

| Task | Priority | Effort | Benefit | Timeline |
|------|----------|--------|---------|----------|
| Extract constants | HIGH | 2h | Maintainability | This week |
| Doctor auth | HIGH | 4-6h | Security | Week 2 |
| Add tests | HIGH | 1 week | Confidence | Week 1-2 |
| Add indexes | HIGH | 1h | Performance | This week |
| Error boundaries | MEDIUM | 2h | UX | Week 1 |
| Caching | MEDIUM | 3h | Performance | Week 1 |
| Activity logging | MEDIUM | 6h | HIPAA | Week 2 |
| Mobile support | MEDIUM | 1 week | Accessibility | Week 3 |
| Dark mode | LOW | 4h | Nice-to-have | Week 4 |

---

## Recommended Execution Order

### Phase 1: Stability (Week 1)
1. Extract risk thresholds to constants
2. Add missing database indexes
3. Implement error boundaries
4. Set up environment configs

### Phase 2: Testing (Week 2)
1. Add unit tests (80% coverage)
2. Implement doctor authentication
3. Add activity logging

### Phase 3: Performance (Week 3)
1. Implement caching with React Query
2. Add optimistic updates
3. Performance monitoring

### Phase 4: Security (Week 4)
1. Add HIPAA encryption
2. Implement error tracking (Sentry)
3. Set up CI/CD pipeline

### Phase 5: UX (Week 5+)
1. Mobile responsiveness
2. Dark mode
3. Keyboard shortcuts
4. Analytics dashboard

---

## Estimated Total Effort

- **Phase 1**: 6 hours
- **Phase 2**: 20 hours
- **Phase 3**: 12 hours
- **Phase 4**: 18 hours
- **Phase 5**: 15 hours

**Total**: ~70 hours (2 developer-weeks)

---

## Conclusion

The MVP is production-ready for testing. These recommendations are for post-MVP improvements to increase reliability, security, and performance as the system scales.

**Next sprint**: Start with Phase 1 items (constants, indexes, error boundaries) for immediate stability improvements.

