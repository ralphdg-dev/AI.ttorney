import LawyerList from "../data/lawyers_list.json";

class RollMatchService {
  constructor() {
    this.lawyersList = [];
    this.initialized = false;
  }

  // Load the lawyers list JSON file
  async loadLawyersList() {
    if (this.initialized && this.lawyersList.length > 0) {
      return this.lawyersList;
    }

    try {
      // Directly use imported JSON
      this.lawyersList = Array.isArray(LawyerList) ? LawyerList : [];
      this.initialized = true;

      return this.lawyersList;
    } catch (error) {
      this.lawyersList = [];
      this.initialized = true;
      return this.lawyersList;
    }
  }

  /**
   * Helper function to normalize and split a full name.
   */
  _parseFullName(fullName) {
    if (!fullName || typeof fullName !== "string") {
      return { firstname: "", lastname: "" };
    }
    const words = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return { firstname: "", lastname: "" };
    }
    const lastname = words.pop();
    const firstname = words.join(" ");
    return { firstname, lastname };
  }

  /**
   * [NEW] Helper function to convert "August 29, 2024" to "2024-08-29"
   */
  _normalizeJsonDate(dateString) {
    if (!dateString || dateString.trim() === "") {
      return null;
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Check for invalid date
        return null;
      }
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0"); // getMonth() is 0-indexed
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * [MODIFIED] Checks an application by Roll Number, Full Name, AND Roll Sign Date.
   * This is for the "View Details" modal.
   */
  async checkApplicationDetails({ rollNumber, fullName, rollSignDate }) {
    if (!this.initialized) {
      await this.loadLawyersList();
    }

    // 1. Check for valid input
    if (!rollNumber || !fullName || !rollSignDate) {
      return {
        matched: false,
        status: "not_found",
        reason: "Roll number, full name, or sign date is missing.",
      };
    }

    // 2. Normalize inputs
    const normalizedRollNumber = rollNumber.toString().trim();
    const { firstname: inputFirstname, lastname: inputLastname } =
      this._parseFullName(fullName);
    const appDate = (rollSignDate || "").trim(); // This is already in "yyyy-mm-dd"

    if (!inputLastname || appDate === "") {
      return {
        matched: false,
        status: "not_found",
        reason: "Invalid name or date.",
      };
    }

    // 3. Find the match with "AND" logic
    const matchedLawyer = this.lawyersList.find((lawyer) => {
      // Normalize JSON data for comparison
      const lawyerRollNo = (lawyer["Roll No."] || "").toString().trim();
      const lawyerLastname = (lawyer.Lastname || "").trim().toLowerCase();
      const lawyerFirstname = (lawyer.Firstname || "").trim().toLowerCase();
      const lawyerDate = this._normalizeJsonDate(lawyer["Roll Signed Date"]); // Convert "Month DD, YYYY"

      // THE CORE "AND" LOGIC
      return (
        lawyerRollNo === normalizedRollNumber &&
        lawyerLastname === inputLastname &&
        lawyerFirstname === inputFirstname &&
        lawyerDate === appDate // <-- ADDED DATE CHECK
      );
    });

    // 4. Return result
    if (matchedLawyer) {
      return {
        matched: true,
        status: "matched",
        lawyer: {
          lastname: matchedLawyer.Lastname,
          firstname: matchedLawyer.Firstname,
          middleName: matchedLawyer["Middle Name"],
          address: matchedLawyer.Address,
          rollSignDate: matchedLawyer["Roll Signed Date"], // Return original JSON format
          rollNo: matchedLawyer["Roll No."],
        },
      };
    }

    return {
      matched: false,
      status: "not_found",
      reason:
        "Roll number, name, and sign date do not match any single record.",
    };
  }

  // [MODIFIED] Batch check multiple applications (for the main list)
  async checkMultipleRollNumbers(applications) {
    if (!this.initialized) {
      await this.loadLawyersList();
    }

    const getAppName = (app) =>
      app.full_name || (app.users && app.users.full_name) || "";

    return applications.map((app) => {
      const rollNumber = app.roll_number;
      const fullName = getAppName(app);
      const appDate = (app.roll_sign_date || "").trim(); // Get the date from the app

      // 1. Check for valid input
      if (!rollNumber || !fullName || !appDate) {
        return { ...app, pra_status: "not_found", pra_match_details: null };
      }

      // 2. Normalize inputs
      const normalizedRollNumber = rollNumber.toString().trim();
      const { firstname: inputFirstname, lastname: inputLastname } =
        this._parseFullName(fullName);

      if (!inputLastname) {
        return { ...app, pra_status: "not_found", pra_match_details: null };
      }

      // 3. Find the match with "AND" logic
      const matchedLawyer = this.lawyersList.find((lawyer) => {
        const lawyerRollNo = (lawyer["Roll No."] || "").toString().trim();
        const lawyerLastname = (lawyer.Lastname || "").trim().toLowerCase();
        const lawyerFirstname = (lawyer.Firstname || "").trim().toLowerCase();
        const lawyerDate = this._normalizeJsonDate(lawyer["Roll Signed Date"]); // Convert "Month DD, YYYY"

        // THE CORE "AND" LOGIC
        return (
          lawyerRollNo === normalizedRollNumber &&
          lawyerLastname === inputLastname &&
          lawyerFirstname === inputFirstname &&
          lawyerDate === appDate // <-- ADDED DATE CHECK
        );
      });

      // 4. Return result
      if (matchedLawyer) {
        return {
          ...app,
          pra_status: "matched",
          pra_match_details: {
            lastname: matchedLawyer.Lastname,
            firstname: matchedLawyer.Firstname,
            middleName: matchedLawyer["Middle Name"],
            address: matchedLawyer.Address,
            rollSignDate: matchedLawyer["Roll Signed Date"],
            rollNo: matchedLawyer["Roll No."],
          },
        };
      }

      return {
        ...app,
        pra_status: "not_found",
        pra_match_details: null,
      };
    });
  }

  // Get statistics about matches (Unchanged)
  getMatchStatistics(applications) {
    const total = applications.length;
    const matched = applications.filter(
      (a) => a.pra_status === "matched"
    ).length;
    const notFound = applications.filter(
      (a) => a.pra_status === "not_found"
    ).length;
    const noRollNumber = applications.filter(
      (a) => !a.roll_number || a.roll_number.trim() === ""
    ).length;

    return {
      total,
      matched,
      notFound,
      noRollNumber,
      matchRate: total > 0 ? ((matched / total) * 100).toFixed(1) : 0,
    };
  }
}

export default new RollMatchService();
