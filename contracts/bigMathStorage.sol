pragma solidity >=0.5.0;

contract bigMathStorage {
	int[] public dailyReturns;
	uint result;
	int summationDailyReturns;
	uint public payoutAtVarianceOf1;
	/*
		Once we have the average daily variance we must annalize by multiplying by 365.2422 (the exact number of days per year)
		we inflate this annualizer by 10**4 to maintain accuracy
		in traditional finance the annualizer is 252 due to the limited number of trading days in a year
		however we are able to find prices at any time of the year so we must adjust our annualizer accordingly
	*/
	uint public annualizer = 3652422;
	uint annualizerInflator = 10**4;
}