package com.microfin.lms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Drives the real HTTP surface against an in-memory database built by the Flyway migration. */
@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@AutoConfigureMockMvc
class ApiFlowTest {

	@TestConfiguration
	static class Config {

		@Bean
		@Primary
		Clock clock() {
			return new MutableClock();
		}
	}

	/** The smallest valid PNG: 1x1 pixel. */
	private static final byte[] PNG = java.util.Base64.getDecoder().decode(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper json;

	@Autowired
	Clock clock;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void applicationToClosedLoan() throws Exception {
		// The clock starts on 2026-03-10 in Asia/Kolkata.
		String admin = signUp("Sunrise Finance", "Asha Admin", "asha@sunrise.test", "9811111111");
		JsonNode officerUser = body(call(admin, post("/api/v1/users"), """
				{"fullName":"Ravi Officer","email":"ravi@sunrise.test","phone":"9822222222","password":"Passw0rd!x","role":"LOAN_OFFICER"}""")
				.andExpect(status().isCreated()));
		String officer = signIn("ravi@sunrise.test", "Passw0rd!x");

		// Only managers set up lines.
		String lineBody = "{\"name\":\"Line 01 · Anna Nagar\",\"frequency\":\"weekly\",\"schedule\":\"Friday\",\"officerId\":"
				+ officerUser.get("id").asLong() + "}";
		call(officer, post("/api/v1/lines"), lineBody).andExpect(status().isForbidden());
		call(admin, post("/api/v1/lines"), "{\"name\":\"Bad\",\"frequency\":\"weekly\"}").andExpect(status().isBadRequest());
		call(admin, post("/api/v1/lines"), lineBody).andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value("L01"))
				.andExpect(jsonPath("$.officer").value("Ravi Officer"))
				.andExpect(jsonPath("$.frequency").value("weekly"));

		// The officer onboards a customer.
		String customer = body(call(officer, post("/api/v1/customers"), """
				{"name":"Revathi Murugan","phone":"9840112233","altPhone":"9884556677","parentName":"Murugan S",
				 "address":"14/221, Bharathi Salai, Chennai","requestedAmount":45000,"lineId":"L01"}""")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("pending"))).get("id").asText();
		assertThat(customer).isEqualTo("C-0001");
		call(officer, post("/api/v1/customers"), """
				{"name":"Someone Else","phone":"9840112233","parentName":"X","address":"Y","requestedAmount":5000,"lineId":"L01"}""")
				.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PHONE_TAKEN"));

		// Pricing preview matches what will be booked.
		call(officer, post("/api/v1/loans/price"), """
				{"type":"POST","principal":12000,"annualRatePct":24,"months":3,"fee":200}""")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalInterest").value(720))
				.andExpect(jsonPath("$.totalPayable").value(12720))
				.andExpect(jsonPath("$.emi").value(4240))
				.andExpect(jsonPath("$.netDisbursal").value(11800));

		// An EMI that cannot recover the loan in the tenure is refused; so is a date far ahead.
		String application = """
				{"customerId":"C-0001","type":"POST","principal":12000,"annualRatePct":24,"months":3,"fee":200,"emi":%d,"disburseOn":"%s"}""";
		call(officer, post("/api/v1/applications"), application.formatted(4000, "2026-03-10"))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("EMI_SHORT"));
		call(officer, post("/api/v1/applications"), application.formatted(4300, "2026-04-10"))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DATE_TOO_FAR"));
		String app = body(call(officer, post("/api/v1/applications"), application.formatted(4300, "2026-03-10"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("pending"))
				.andExpect(jsonPath("$.submittedBy").value("Ravi Officer"))
				.andExpect(jsonPath("$.approvalBlocker").value("noProof"))).get("id").asText();
		call(officer, post("/api/v1/applications"), application.formatted(4300, "2026-03-10"))
				.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("APPLICATION_OPEN"));

		// Officers cannot approve; nobody can without identity proof.
		call(officer, post("/api/v1/applications/" + app + "/approve"), "{}").andExpect(status().isForbidden());
		call(admin, post("/api/v1/applications/" + app + "/approve"), "{}")
				.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NO_PROOF"));

		// KYC: a malformed number and a non-image are refused; a real one is stored encrypted.
		kyc(officer, customer, "AADHAAR", "1234", PNG).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("ID_FORMAT"));
		kyc(officer, customer, "AADHAAR", "4321 7890 5612", "not an image".getBytes())
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NOT_AN_IMAGE"));
		kyc(officer, customer, "AADHAAR", "4321 7890 5612", PNG).andExpect(status().isOk())
				.andExpect(jsonPath("$.proofs.length()").value(1))
				.andExpect(jsonPath("$.proofs[0].number").value("432178905612"))
				.andExpect(jsonPath("$.proofs[0].front.url").value("/api/v1/customers/C-0001/kyc/AADHAAR/front"));
		assertThat(jdbc.queryForObject("select p.id_number from customer_id_proofs p join customers c on c.id = p.customer_id"
				+ " where c.code = 'C-0001'", String.class)).doesNotContain("432178905612");
		call(officer, get("/api/v1/customers/C-0001/kyc/AADHAAR/front"), null).andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG)).andExpect(content().bytes(PNG));
		mvc.perform(get("/api/v1/customers/C-0001/kyc/AADHAAR/front")).andExpect(status().isUnauthorized());

		// Several proofs: a second type is added alongside, the same type replaces in place.
		kyc(officer, customer, "PAN", "akjpv 8821m", PNG).andExpect(status().isOk())
				.andExpect(jsonPath("$.proofs.length()").value(2))
				.andExpect(jsonPath("$.proofs[1].type").value("PAN"))
				.andExpect(jsonPath("$.proofs[1].number").value("AKJPV8821M"));
		kyc(officer, customer, "PAN", "CQRPS4410K", PNG).andExpect(status().isOk())
				.andExpect(jsonPath("$.proofs.length()").value(2))
				.andExpect(jsonPath("$.proofs[1].number").value("CQRPS4410K"));
		assertThat(jdbc.queryForObject("select count(*) from stored_files", Long.class)).isEqualTo(2);
		call(officer, delete("/api/v1/customers/C-0001/kyc/PAN"), null).andExpect(status().isOk())
				.andExpect(jsonPath("$.proofs.length()").value(1))
				.andExpect(jsonPath("$.proofs[0].type").value("AADHAAR"));
		assertThat(jdbc.queryForObject("select count(*) from stored_files", Long.class)).isEqualTo(1);
		call(officer, delete("/api/v1/customers/C-0001/kyc/PAN"), null).andExpect(status().isNotFound());
		call(officer, get("/api/v1/customers/C-0001/kyc/PAN/front"), null).andExpect(status().isNotFound());

		// Doorstep pin.
		call(officer, put("/api/v1/customers/C-0001/geo"), "{\"lat\":12.9752,\"lng\":80.2212,\"accuracy\":8}")
				.andExpect(status().isOk()).andExpect(jsonPath("$.geo.lat").value(12.9752));

		// Approve, then disburse: the loan is dated today and its schedule recovers exactly 12,720.
		call(admin, post("/api/v1/applications/" + app + "/approve"), "{\"note\":\"Looks fine\"}")
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("approved"));
		call(admin, post("/api/v1/applications/" + app + "/reject"), "{\"reason\":\"Changed my mind\"}")
				.andExpect(status().isConflict());
		call(officer, post("/api/v1/applications/" + app + "/disburse"), null).andExpect(status().isForbidden());
		String loan = body(call(admin, post("/api/v1/applications/" + app + "/disburse"), null)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.loan.disbursedOn").value("2026-03-10"))
				.andExpect(jsonPath("$.summary.outstanding").value(12720))
				.andExpect(jsonPath("$.summary.netDisbursal").value(11800))
				.andExpect(jsonPath("$.summary.state").value("active"))
				.andExpect(jsonPath("$.schedule", hasSize(3)))
				.andExpect(jsonPath("$.schedule[0].dueOn").value("2026-04-10"))
				.andExpect(jsonPath("$.schedule[0].amount").value(4300))
				.andExpect(jsonPath("$.schedule[2].amount").value(4120))
				.andExpect(jsonPath("$.schedule[2].balanceAfter").value(0))).get("loan").get("id").asText();
		call(admin, post("/api/v1/applications/" + app + "/disburse"), null).andExpect(status().isConflict());
		call(officer, get("/api/v1/customers/C-0001"), null).andExpect(jsonPath("$.status").value("active"));
		call(officer, get("/api/v1/applications/" + app), null).andExpect(jsonPath("$.loanId").value(loan));

		// Nothing is due yet, so nothing is on the sheet and nothing can be collected.
		call(officer, get("/api/v1/collection/sheet"), null).andExpect(jsonPath("$", hasSize(0)));
		String pay = "{\"seq\":%d,\"paidOn\":\"%s\",\"mode\":\"%s\",\"geo\":{\"lat\":12.9753,\"lng\":80.2213}%s}";
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(1, "2026-03-10", "CASH", ""))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DATE_BEFORE_DUE"));

		// One month on: installment 1 is due today.
		((MutableClock) clock).advance(Duration.ofDays(31));
		admin = signIn("asha@sunrise.test", "Passw0rd!x");
		officer = signIn("ravi@sunrise.test", "Passw0rd!x");
		call(officer, get("/api/v1/collection/sheet"), null).andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].id").value(loan + "-1"))
				.andExpect(jsonPath("$[0].status").value("due"))
				.andExpect(jsonPath("$[0].amount").value(4300));
		call(officer, get("/api/v1/lines"), null).andExpect(jsonPath("$[0].due").value(4300))
				.andExpect(jsonPath("$[0].collected").value(0)).andExpect(jsonPath("$[0].accounts").value(1));
		call(officer, get("/api/v1/lines/L01/route"), null).andExpect(jsonPath("$.stops", hasSize(1)))
				.andExpect(jsonPath("$.unmapped", hasSize(0)));

		// An officer sees only their own lines: one with none sees an empty branch, and Ravi's records answer 404.
		call(admin, post("/api/v1/users"), """
				{"fullName":"Uma Officer","email":"uma@sunrise.test","phone":"9833333333","password":"Passw0rd!x","role":"LOAN_OFFICER"}""")
				.andExpect(status().isCreated());
		String other = signIn("uma@sunrise.test", "Passw0rd!x");
		call(other, get("/api/v1/lines"), null).andExpect(jsonPath("$", hasSize(0)));
		call(other, get("/api/v1/customers"), null).andExpect(jsonPath("$", hasSize(0)));
		call(other, get("/api/v1/loans"), null).andExpect(jsonPath("$", hasSize(0)));
		call(other, get("/api/v1/applications"), null).andExpect(jsonPath("$", hasSize(0)));
		call(other, get("/api/v1/collection/sheet"), null).andExpect(jsonPath("$", hasSize(0)));
		call(other, get("/api/v1/dashboard"), null).andExpect(jsonPath("$.kpis[0].value").value(0))
				.andExpect(jsonPath("$.pendingApprovals").value(0));
		call(other, get("/api/v1/lines/L01"), null).andExpect(status().isNotFound());
		call(other, get("/api/v1/lines/L01/route"), null).andExpect(status().isNotFound());
		call(other, get("/api/v1/customers/C-0001"), null).andExpect(status().isNotFound());
		call(other, get("/api/v1/customers/C-0001/kyc/AADHAAR/front"), null).andExpect(status().isNotFound());
		call(other, get("/api/v1/loans/" + loan), null).andExpect(status().isNotFound());
		call(other, get("/api/v1/applications/" + app), null).andExpect(status().isNotFound());
		call(other, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(1, "2026-04-10", "CASH", ""))
				.andExpect(status().isNotFound());
		call(other, post("/api/v1/customers"), """
				{"name":"Kala","phone":"9844444444","parentName":"Mani","address":"2, Main Road","requestedAmount":20000,"lineId":"L01"}""")
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UNKNOWN_LINE"));
		call(admin, get("/api/v1/loans"), null).andExpect(jsonPath("$", hasSize(1)));

		// Installments go in order, never from the future, and a repeat does not mint a second receipt.
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(2, "2026-04-10", "CASH", ""))
				.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("WRONG_INSTALLMENT"));
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(1, "2026-04-11", "CASH", ""))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DATE_AHEAD"));
		String receipt = "RC-" + loan.substring(3) + "-01";
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(1, "2026-04-10", "UPI", ",\"clientOpId\":\"op-1\""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.receiptNo").value(receipt))
				.andExpect(jsonPath("$.amount").value(4300))
				.andExpect(jsonPath("$.daysLate").value(0));
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(1, "2026-04-10", "UPI", ",\"clientOpId\":\"op-1\""))
				.andExpect(status().isCreated()).andExpect(jsonPath("$.receiptNo").value(receipt));
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(1, "2026-04-10", "CASH", ""))
				.andExpect(status().isConflict());
		call(officer, get("/api/v1/collection/sheet"), null).andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].status").value("collected"));
		call(officer, get("/api/v1/dashboard"), null)
				.andExpect(jsonPath("$.kpis[0].value").value(8420))
				.andExpect(jsonPath("$.kpis[1].value").value(4300))
				.andExpect(jsonPath("$.collectionsWeek", hasSize(7)));

		// 40 more days: installment 2 is 10 days overdue and the loan shows as such.
		((MutableClock) clock).advance(Duration.ofDays(40));
		admin = signIn("asha@sunrise.test", "Passw0rd!x");
		officer = signIn("ravi@sunrise.test", "Passw0rd!x");
		call(officer, get("/api/v1/loans?state=overdue"), null).andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].summary.daysLate").value(10))
				.andExpect(jsonPath("$[0].summary.overdueAmount").value(4300));
		call(admin, get("/api/v1/insights"), null)
				.andExpect(jsonPath("$.risk.par1").value(1.0))
				.andExpect(jsonPath("$.risk.loans[0].factors[0]").value("currentArrears"));

		// The device was offline: two receipts arrive as a batch, one of them a replay, one invalid.
		String batch = """
				{"items":[
				 {"clientOpId":"op-2","loanId":"%1$s","payment":{"seq":2,"paidOn":"2026-05-15","mode":"CASH"}},
				 {"clientOpId":"op-1","loanId":"%1$s","payment":{"seq":1,"paidOn":"2026-04-10","mode":"UPI"}},
				 {"clientOpId":"op-3","loanId":"%1$s","payment":{"seq":3,"paidOn":"2026-05-15","mode":"CASH"}}]}""".formatted(loan);
		call(officer, post("/api/v1/sync/payments"), batch).andExpect(status().isOk())
				.andExpect(jsonPath("$.results[0].status").value("APPLIED"))
				.andExpect(jsonPath("$.results[0].receipt.daysLate").value(5))
				.andExpect(jsonPath("$.results[1].status").value("DUPLICATE"))
				.andExpect(jsonPath("$.results[2].status").value("REJECTED"))
				.andExpect(jsonPath("$.results[2].code").value("DATE_BEFORE_DUE"));

		// Final installment closes the loan.
		((MutableClock) clock).advance(Duration.ofDays(30));
		admin = signIn("asha@sunrise.test", "Passw0rd!x");
		officer = signIn("ravi@sunrise.test", "Passw0rd!x");
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(3, "2026-06-10", "CASH", ""))
				.andExpect(status().isCreated()).andExpect(jsonPath("$.amount").value(4120));
		call(officer, get("/api/v1/loans/" + loan), null)
				.andExpect(jsonPath("$.summary.state").value("closed"))
				.andExpect(jsonPath("$.summary.outstanding").value(0))
				.andExpect(jsonPath("$.summary.paid").value(12720))
				.andExpect(jsonPath("$.repayments", hasSize(3)))
				.andExpect(jsonPath("$.repayments[0].seq").value(3));
		call(officer, post("/api/v1/loans/" + loan + "/payments"), pay.formatted(4, "2026-06-10", "CASH", ""))
				.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("LOAN_CLOSED"));

		// Reports are for managers and add up.
		call(officer, get("/api/v1/reports/day-book"), null).andExpect(status().isForbidden());
		call(admin, get("/api/v1/reports/collection-register?from=2026-03-01&to=2026-06-30"), null)
				.andExpect(jsonPath("$.receipts", hasSize(3))).andExpect(jsonPath("$.total").value(12720))
				.andExpect(jsonPath("$.upi").value(4300));
		call(admin, get("/api/v1/reports/day-book?from=2026-03-01&to=2026-06-30"), null)
				.andExpect(jsonPath("$[0].disbursedOut").value(11800)).andExpect(jsonPath("$[3].closing").value(920));
		call(admin, get("/api/v1/reports/portfolio-summary"), null).andExpect(jsonPath("$[0].closedLoans").value(1));
		call(admin, get("/api/v1/reports/disbursement-register?from=2026-03-01&to=2026-03-31"), null)
				.andExpect(jsonPath("$.loans[0].applicationId").value(app)).andExpect(jsonPath("$.loans[0].note").value("Looks fine"));
		call(admin, get("/api/v1/reports/overdue-ageing"), null).andExpect(status().isOk());
		call(admin, get("/api/v1/reports/line-performance?from=2026-03-01&to=2026-06-30"), null)
				.andExpect(jsonPath("$[0].efficiency").value(1.0));
		call(admin, get("/api/v1/audit-logs"), null).andExpect(jsonPath("$[0].action").value("PAYMENT_RECORDED"));

		// The pin can be cleared again.
		call(officer, delete("/api/v1/customers/C-0001/geo"), null).andExpect(jsonPath("$.geo").doesNotExist());
	}

	@Test
	void companiesCannotSeeEachOther() throws Exception {
		String first = signUp("First Finance", "Fatima", "fatima@first.test", "9833333333");
		String second = signUp("Second Finance", "Suresh", "suresh@second.test", "9844444444");

		call(first, post("/api/v1/lines"), "{\"name\":\"Line A\",\"frequency\":\"daily\"}").andExpect(status().isCreated());
		call(first, post("/api/v1/customers"), """
				{"name":"Private Person","phone":"9855555555","parentName":"P","address":"A","requestedAmount":5000,"lineId":"L01"}""")
				.andExpect(status().isCreated());

		// Codes restart per company, yet the second company sees none of the first's rows.
		call(second, get("/api/v1/lines"), null).andExpect(jsonPath("$", hasSize(0)));
		call(second, get("/api/v1/customers"), null).andExpect(jsonPath("$", hasSize(0)));
		call(second, get("/api/v1/customers/C-0001"), null).andExpect(status().isNotFound());
		call(second, get("/api/v1/lines/L01/route"), null).andExpect(status().isNotFound());
		call(second, post("/api/v1/customers"), """
				{"name":"Other Person","phone":"9855555555","parentName":"P","address":"A","requestedAmount":5000,"lineId":"L01"}""")
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UNKNOWN_LINE"));
		call(second, get("/api/v1/users"), null).andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void accountSecurity() throws Exception {
		String admin = signUp("Secure Finance", "Meera", "meera@secure.test", "9866666666");
		mvc.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/dashboard").header("Authorization", "Bearer nonsense")).andExpect(status().isUnauthorized());
		mvc.perform(get("/health")).andExpect(status().isOk());
		call(admin, get("/api/v1/auth/me"), null).andExpect(jsonPath("$.role").value("ADMIN"))
				.andExpect(jsonPath("$.company").value("Secure Finance"));

		// Same email twice, weak password, bad phone.
		anonymous(post("/api/v1/auth/sign-up"), signUpBody("Again", "Meera", "MEERA@secure.test", "9866666666", "Passw0rd!x"))
				.andExpect(status().isConflict());
		anonymous(post("/api/v1/auth/sign-up"), signUpBody("Weak", "W", "weak@secure.test", "9866666666", "short"))
				.andExpect(status().isBadRequest());
		anonymous(post("/api/v1/auth/sign-up"), signUpBody("Phone", "P", "phone@secure.test", "12345", "Passw0rd!x"))
				.andExpect(status().isBadRequest());

		// Changing the password signs the old token out.
		String fresh = body(call(admin, post("/api/v1/auth/change-password"),
				"{\"currentPassword\":\"Passw0rd!x\",\"newPassword\":\"N3w-Passw0rd\"}").andExpect(status().isOk())).get("token").asText();
		((MutableClock) clock).advance(Duration.ofSeconds(2));
		call(admin, get("/api/v1/auth/me"), null).andExpect(status().isUnauthorized());
		call(fresh, get("/api/v1/auth/me"), null).andExpect(status().isOk());

		// Forgot password: the same answer for unknown emails; the token works once.
		anonymous(post("/api/v1/auth/forgot-password"), "{\"email\":\"nobody@secure.test\"}")
				.andExpect(status().isOk()).andExpect(jsonPath("$.devResetToken").doesNotExist());
		String token = body(anonymous(post("/api/v1/auth/forgot-password"), "{\"email\":\"meera@secure.test\"}")
				.andExpect(status().isOk())).get("devResetToken").asText();
		String reset = "{\"token\":\"" + token + "\",\"password\":\"Reset-Passw0rd\"}";
		anonymous(post("/api/v1/auth/reset-password"), reset).andExpect(status().isNoContent());
		anonymous(post("/api/v1/auth/reset-password"), reset).andExpect(status().isBadRequest());
		signIn("meera@secure.test", "Reset-Passw0rd");

		// A suspended officer is locked out at once; a manager cannot touch admin accounts.
		JsonNode officer = body(call(signIn("meera@secure.test", "Reset-Passw0rd"), post("/api/v1/users"), """
				{"fullName":"Temp Officer","email":"temp@secure.test","phone":"9877777777","password":"Passw0rd!x","role":"LOAN_OFFICER"}""")
				.andExpect(status().isCreated()));
		String officerToken = signIn("temp@secure.test", "Passw0rd!x");
		call(officerToken, get("/api/v1/users"), null).andExpect(status().isForbidden());
		String adminToken = signIn("meera@secure.test", "Reset-Passw0rd");
		call(adminToken, patch("/api/v1/users/" + officer.get("id").asLong()), "{\"status\":\"SUSPENDED\"}").andExpect(status().isOk());
		call(officerToken, get("/api/v1/auth/me"), null).andExpect(status().isUnauthorized());
		anonymous(post("/api/v1/auth/sign-in"), "{\"email\":\"temp@secure.test\",\"password\":\"Passw0rd!x\"}")
				.andExpect(status().isForbidden());

		// Repeated wrong passwords are throttled.
		for (int i = 0; i < 5; i++) {
			anonymous(post("/api/v1/auth/sign-in"), "{\"email\":\"meera@secure.test\",\"password\":\"wrong\"}")
					.andExpect(status().isUnauthorized());
		}
		anonymous(post("/api/v1/auth/sign-in"), "{\"email\":\"meera@secure.test\",\"password\":\"Reset-Passw0rd\"}")
				.andExpect(status().isTooManyRequests());
	}

	// ---- helpers ----

	private String signUp(String company, String name, String email, String phone) throws Exception {
		return body(anonymous(post("/api/v1/auth/sign-up"), signUpBody(company, name, email, phone, "Passw0rd!x"))
				.andExpect(status().isCreated())).get("token").asText();
	}

	private static String signUpBody(String company, String name, String email, String phone, String password) {
		return "{\"companyName\":\"%s\",\"fullName\":\"%s\",\"email\":\"%s\",\"phone\":\"%s\",\"password\":\"%s\"}"
				.formatted(company, name, email, phone, password);
	}

	private String signIn(String email, String password) throws Exception {
		return body(anonymous(post("/api/v1/auth/sign-in"), "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}")
				.andExpect(status().isOk())).get("token").asText();
	}

	private ResultActions anonymous(MockHttpServletRequestBuilder request, String jsonBody) throws Exception {
		return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(jsonBody));
	}

	private ResultActions call(String token, MockHttpServletRequestBuilder request, String jsonBody) throws Exception {
		request.header("Authorization", "Bearer " + token);
		if (jsonBody != null) {
			request.contentType(MediaType.APPLICATION_JSON).content(jsonBody);
		}
		return mvc.perform(request);
	}

	private ResultActions kyc(String token, String customer, String type, String number, byte[] front) throws Exception {
		return mvc.perform(multipart(org.springframework.http.HttpMethod.PUT, "/api/v1/customers/" + customer + "/kyc")
				.file(new MockMultipartFile("front", "aadhaar-front.png", "image/png", front))
				.param("type", type).param("number", number)
				.header("Authorization", "Bearer " + token));
	}

	private JsonNode body(ResultActions result) throws Exception {
		return json.readTree(result.andReturn().getResponse().getContentAsString());
	}
}
