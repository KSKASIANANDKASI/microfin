package com.microfin.lms.service;

import com.microfin.lms.domain.CodeCounter;
import com.microfin.lms.domain.Company;
import com.microfin.lms.domain.Customer;
import com.microfin.lms.domain.CustomerIdProof;
import com.microfin.lms.domain.Enums.ApplicationStatus;
import com.microfin.lms.domain.Enums.CustomerStatus;
import com.microfin.lms.domain.Enums.Frequency;
import com.microfin.lms.domain.Enums.IdType;
import com.microfin.lms.domain.Enums.LoanStatus;
import com.microfin.lms.domain.Enums.LoanType;
import com.microfin.lms.domain.Enums.PaymentMode;
import com.microfin.lms.domain.Enums.Role;
import com.microfin.lms.domain.Installment;
import com.microfin.lms.domain.Line;
import com.microfin.lms.domain.Loan;
import com.microfin.lms.domain.LoanApplication;
import com.microfin.lms.domain.Payment;
import com.microfin.lms.domain.User;
import com.microfin.lms.loan.LoanCalculator;
import com.microfin.lms.repo.CodeCounterRepository;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.CustomerRepository;
import com.microfin.lms.repo.InstallmentRepository;
import com.microfin.lms.repo.LineRepository;
import com.microfin.lms.repo.LoanApplicationRepository;
import com.microfin.lms.repo.PaymentRepository;
import com.microfin.lms.common.Today;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads the sample branch the screens were designed against, once, into an empty database. Only
 * active when {@code lms.demo.seed=true} (the dev profile). Loans are dated back from today so
 * the collection sheet is always live.
 */
@Component
@ConditionalOnProperty(name = "lms.demo.seed", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

	/** Every demo account signs in with this. Dev only. */
	public static final String PASSWORD = "Demo@12345";

	private final CompanyRepository companies;
	private final LineRepository lines;
	private final CustomerRepository customers;
	private final LoanApplicationRepository applications;
	private final InstallmentRepository installments;
	private final PaymentRepository payments;
	private final CodeCounterRepository counters;
	private final AuthService auth;
	private final ApplicationService loanBooking;
	private final Today today;

	private final Map<String, Line> lineByCode = new HashMap<>();
	private final Map<String, Customer> customerByKey = new HashMap<>();

	public DemoDataSeeder(CompanyRepository companies, LineRepository lines, CustomerRepository customers,
			LoanApplicationRepository applications, InstallmentRepository installments, PaymentRepository payments,
			CodeCounterRepository counters, AuthService auth, ApplicationService loanBooking, Today today) {
		this.companies = companies;
		this.lines = lines;
		this.customers = customers;
		this.applications = applications;
		this.installments = installments;
		this.payments = payments;
		this.counters = counters;
		this.auth = auth;
		this.loanBooking = loanBooking;
		this.today = today;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (companies.count() > 0) {
			return;
		}
		Instant now = today.instant();
		Company company = new Company();
		company.setName("BillionBrains Microfinance · Chennai");
		company.setOfficeLat(new BigDecimal("13.085000"));
		company.setOfficeLng(new BigDecimal("80.210100"));
		company.setDailyTarget(25_000);
		company.setCreatedAt(now);
		companies.save(company);

		auth.newUser(company, "Demo Admin", "admin@demo.lms", "9000000001", PASSWORD, Role.ADMIN, now);
		auth.newUser(company, "Anitha Rajendran", "anitha@demo.lms", "9000000002", PASSWORD, Role.MANAGER, now);
		User saravanan = auth.newUser(company, "Saravanan M", "saravanan@demo.lms", "9000000003", PASSWORD, Role.LOAN_OFFICER, now);
		User priya = auth.newUser(company, "Priya Dharshini", "priya@demo.lms", "9000000004", PASSWORD, Role.LOAN_OFFICER, now);
		User vetrivel = auth.newUser(company, "Vetrivel S", "vetrivel@demo.lms", "9000000005", PASSWORD, Role.LOAN_OFFICER, now);
		User kalai = auth.newUser(company, "Kalaiselvi R", "kalaiselvi@demo.lms", "9000000006", PASSWORD, Role.LOAN_OFFICER, now);

		line(company, "L01", "Line 01 · T. Nagar", vetrivel, Frequency.DAILY, null, now);
		line(company, "L02", "Line 02 · Perambur", priya, Frequency.DAILY, null, now);
		line(company, "L04", "Line 04 · Velachery", saravanan, Frequency.WEEKLY, "Friday", now);
		line(company, "L07", "Line 07 · Mylapore", saravanan, Frequency.MONTHLY_INTEREST, "5", now);

		customer(company, "c1", "Revathi Murugan", "9840112233", "9884556677", "Murugan Subramani",
				"14/221, Bharathi Salai, Velachery, Chennai 600042", 45000, "L04", "12.9752", "80.2212", 8, IdType.AADHAAR, "432178905612", now);
		customer(company, "c2", "Senthil Kumaran", "9962440155", null, "Kumaran Selvaraj",
				"8B Sriram Flats, Paper Mills Road, Perambur, Chennai 600011", 60000, "L02", "13.1143", "80.2331", 12, IdType.PAN, "AKJPV8821M", now);
		customer(company, "c3", "Nasreen Basheer", "9445771208", "9840993311", "Basheer Ahmed",
				"23, Kutchery Road, Mylapore, Chennai 600004", 30000, "L07", "13.0339", "80.2687", 9, IdType.VOTER_ID, "TNM4471902", now);
		customer(company, "c4", "Arulraj Devadoss", "9884320176", null, "Devadoss Anthony",
				"3/118, Thiruvalluvar Street, Velachery, Chennai 600042", 85000, "L04", "12.9784", "80.2196", 6, null, null, now);
		customer(company, "c5", "Lakshmi Priya", "9790213344", null, "Ramasamy Krishnan",
				"41, Usman Road, T. Nagar, Chennai 600017", 25000, "L01", "13.0418", "80.2341", 7, IdType.AADHAAR, "581203349927", now);
		customer(company, "c6", "Kavitha Elangovan", "9500871120", "9444120087", "Elangovan Pandian",
				"12/5, Madhavaram High Road, Perambur, Chennai 600011", 60000, "L02", "13.1172", "80.2389", 11, IdType.AADHAAR, "730418822561", now);
		customer(company, "c7", "Divya Shankar", "9677034512", null, "Shankar Narayanan",
				"7, Royapettah High Road, Mylapore, Chennai 600004", 20000, "L07", "13.0368", "80.2676", 10, IdType.PAN, "CQRPS4410K", now);
		customer(company, "c8", "Vignesh Kumar", "9841556790", null, "Kumar Velu",
				"88, Pondy Bazaar, T. Nagar, Chennai 600017", 40000, "L01", "13.0405", "80.2337", 14, IdType.DRIVING_LICENSE, "TN0920190004512", now);
		customer(company, "c9", "Meena Gopal", "9884761023", null, "Gopal Rajan",
				"5/2, Taramani Link Road, Velachery, Chennai 600042", 35000, "L04", null, null, 0, null, null, now);

		loan("LN-20418", "c1", LoanType.POST, 45000, "24", 12, 900, 4650, backdated(6, 0), 0, 0, 2, 0, 0);
		loan("LN-20377", "c2", LoanType.PRE, 60000, "20", 18, 1200, 3350, backdated(7, 0), 0, 0, 0, 1, 0, 0);
		loan("LN-19980", "c3", LoanType.POST, 30000, "24", 12, 600, 3100, backdated(8, 3), 0, 0, 4, 0, 6, 2, 5);
		loan("LN-20112", "c4", LoanType.PRE, 50000, "18", 10, 1000, 5000, backdated(4, 10), 0, 8, 12);
		loan("LN-20455", "c5", LoanType.POST, 25000, "24", 12, 500, 2600, backdated(2, 0), 0, 0);
		loan("LN-20390", "c6", LoanType.POST, 60000, "24", 12, 1200, 6200, backdated(5, 0), 0, 0, 0, 0);
		loan("LN-20204", "c7", LoanType.POST, 20000, "20", 10, 400, 2334, backdated(8, 0), 0, 1, 0, 0, 0, 3, 0, 0);
		loan("LN-19845", "c8", LoanType.POST, 40000, "24", 12, 800, 4134, backdated(10, 15), 0, 0, 5, 9, 3, 11, 7, 14, 10);
		// Closed: Revathi's first loan, repaid in full before LN-20418.
		loan("LN-18702", "c1", LoanType.POST, 25000, "24", 10, 500, 3000, today.date().minusMonths(17).withDayOfMonth(10), 0, 0, 1, 0, 0, 0, 3, 0, 0, 0);

		application(company, "APP-3098", "c7", LoanType.POST, 20000, "30", 6, 400, 3, ApplicationStatus.REJECTED,
				"Rate above the line policy. Resubmit at 24%.");
		application(company, "APP-3101", "c2", LoanType.POST, 60000, "24", 12, 1200, 2, ApplicationStatus.APPROVED,
				"Clean record on LN-20377. Disburse at the branch.");
		application(company, "APP-3104", "c5", LoanType.PRE, 25000, "24", 6, 250, 1, ApplicationStatus.PENDING, null);
		application(company, "APP-3107", "c9", LoanType.POST, 35000, "24", 10, 500, 0, ApplicationStatus.PENDING, null);

		// New codes carry on from the highest seeded one.
		counter(company, "line", 7);
		counter(company, "customer", 9);
		counter(company, "application", 3107);
		counter(company, "loan", 20455);

		log.info("Demo data loaded. Sign in as anitha@demo.lms (manager) or saravanan@demo.lms (officer), password {}", PASSWORD);
	}

	/** The disbursal date that puts installment {@code seq} due {@code daysAgo} days before today. */
	private LocalDate backdated(int seq, int daysAgo) {
		LocalDate due = today.date().minusDays(daysAgo);
		YearMonth month = YearMonth.from(due).minusMonths(seq);
		return month.atDay(Math.min(due.getDayOfMonth(), month.lengthOfMonth()));
	}

	private void line(Company company, String code, String name, User officer, Frequency frequency, String schedule, Instant now) {
		Line line = new Line();
		line.setCompany(company);
		line.setCode(code);
		line.setName(name);
		line.setOfficer(officer);
		line.setFrequency(frequency);
		line.setSchedule(schedule);
		line.setCreatedAt(now);
		lineByCode.put(code, lines.save(line));
	}

	private void customer(Company company, String key, String name, String phone, String altPhone, String parentName,
			String address, long requested, String lineCode, String lat, String lng, int accuracy, IdType idType,
			String idNumber, Instant now) {
		Customer c = new Customer();
		c.setCompany(company);
		c.setCode(String.format("C-%04d", Integer.parseInt(key.substring(1))));
		c.setLine(lineByCode.get(lineCode));
		c.setName(name);
		c.setPhone(phone);
		c.setAltPhone(altPhone);
		c.setParentName(parentName);
		c.setAddress(address);
		c.setRequestedAmount(requested);
		c.setStatus(CustomerStatus.PENDING);
		if (lat != null) {
			c.setGeoLat(new BigDecimal(lat));
			c.setGeoLng(new BigDecimal(lng));
			c.setGeoAccuracy(BigDecimal.valueOf(accuracy));
			c.setGeoCapturedAt(now.minus(30, ChronoUnit.DAYS));
		}
		c.setCreatedAt(now);
		c.setUpdatedAt(now);
		if (idType != null) {
			CustomerIdProof proof = new CustomerIdProof();
			proof.setCustomer(c);
			proof.setIdType(idType);
			proof.setIdNumber(idNumber);
			proof.setCreatedAt(now);
			proof.setUpdatedAt(now);
			c.getProofs().add(proof);
		}
		customerByKey.put(key, customers.save(c));
	}

	/** Books a loan and receipts one installment per entry of {@code lateness}: days after its due date. */
	private void loan(String loanNo, String customerKey, LoanType type, long principal, String rate, int months, long fee,
			long emi, LocalDate disbursedOn, int... lateness) {
		Customer customer = customerByKey.get(customerKey);
		Loan loan = loanBooking.book(loanNo, null, customer, type, principal, new BigDecimal(rate),
				months, fee, emi, disbursedOn);
		customer.setStatus(CustomerStatus.ACTIVE);

		List<Installment> schedule = installments.findByLoanIdOrderBySeqAsc(loan.getId());
		ZoneId zone = ZoneId.of("Asia/Kolkata");
		for (int i = 0; i < lateness.length && i < schedule.size(); i++) {
			Installment installment = schedule.get(i);
			LocalDate paidOn = installment.getDueOn().plusDays(lateness[i]);
			installment.setPaidOn(paidOn);

			Payment payment = new Payment();
			payment.setCompany(loan.getCompany());
			payment.setLoan(loan);
			payment.setInstallment(installment);
			payment.setSeq(installment.getSeq());
			payment.setReceiptNo(PaymentService.receiptNo(loanNo, installment.getSeq()));
			payment.setAmount(installment.getAmount());
			payment.setPaidOn(paidOn);
			payment.setDaysLate(lateness[i]);
			payment.setMode(i % 3 == 2 ? PaymentMode.UPI : PaymentMode.CASH);
			Instant late = paidOn.atTime(LocalTime.of(11, 30)).atZone(zone).toInstant();
			// A receipt dated today cannot have been posted later than now.
			payment.setPostedAt(late.isAfter(today.instant()) ? today.instant() : late);
			payments.save(payment);
		}
		if (lateness.length >= schedule.size()) {
			loan.setStatus(LoanStatus.CLOSED);
			loan.setClosedOn(schedule.get(schedule.size() - 1).getPaidOn());
		}
	}

	private void application(Company company, String code, String customerKey, LoanType type, long principal, String rate,
			int months, long fee, int submittedDaysAgo, ApplicationStatus status, String note) {
		Customer customer = customerByKey.get(customerKey);
		BigDecimal annualRate = new BigDecimal(rate);
		LocalDate now = today.date();
		LoanApplication a = new LoanApplication();
		a.setCompany(company);
		a.setCode(code);
		a.setCustomer(customer);
		a.setLine(customer.getLine());
		a.setType(type);
		a.setPrincipal(principal);
		a.setAnnualRatePct(annualRate);
		a.setMonths(months);
		a.setFee(fee);
		a.setEmi(LoanCalculator.compute(principal, annualRate, months, fee, type).emi());
		a.setDisburseOn(now);
		a.setSubmittedOn(now.minusDays(submittedDaysAgo));
		a.setSubmittedBy(customer.getLine().officerName());
		a.setStatus(status);
		a.setNote(note);
		a.setDecidedOn(status == ApplicationStatus.PENDING ? null : now);
		a.setCreatedAt(today.instant());
		applications.save(a);
	}

	private void counter(Company company, String name, long lastValue) {
		counters.save(new CodeCounter(new CodeCounter.Key(company.getId(), name), lastValue));
	}
}
